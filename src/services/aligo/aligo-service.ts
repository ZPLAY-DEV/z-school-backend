import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import {
  AligoBulkSendBaseDto,
  AligoBulkSendDto,
  AligoBulkSendResult,
  AligoTextTarget,
  AligoWrapperResult,
} from 'src/services/aligo/types';

@Injectable()
export class AligoService {
  private readonly logger = new Logger(AligoService.name);
  private readonly baseUrl: string;
  private readonly auth: {
    key: string;
    user_id: string;
  };
  private readonly MAX_PHONES_PER_BATCH = 500;
  private readonly RETRY_DELAY_MS = 1000;

  constructor() {
    this.baseUrl = process.env.ALIGO_URL || 'https://apis.aligo.in';
    this.auth = {
      key: process.env.ALIGO_KEY || '',
      user_id: process.env.ALIGO_UID || '',
    };
  }

  private async postRequest(
    data: Record<string, any>,
    endpoint: string,
  ): Promise<any> {
    const formData = new FormData();

    // Add auth data
    formData.append('key', this.auth.key);
    formData.append('user_id', this.auth.user_id);

    // Add other data
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(error);
      throw new BadRequestException(HttpErrorConstants.ALIGO_FAILED);
    }
  }

  /**
   * 문자보내기
   */
  async send(dto: {
    sender: string;
    receiver: string;
    msg: string;
    msg_type?: string;
    title?: string; // 제목 (미사용)
    destination?: string; // 고객명 치환용 값 (미사용))
    rdate?: string; // 예약일 (미사용)
    rtime?: string; // 예약시간 (미사용)
    testmode_yn?: string; // dryrun 여부
  }): Promise<any> {
    return this.postRequest(
      {
        ...dto,
        sender: dto.sender.replace(/[^0-9]/g, ''),
        receiver: dto.receiver.replace(/[^0-9]/g, ''),
      },
      '/send/',
    );
  }

  /**
   * 대량 문자 발송을 위한 유틸리티 메서드
   * 배열 형태의 메시지를 API가 요구하는 형태로 변환
   */
  async sendBulk(
    baseDto: AligoBulkSendBaseDto,
    targets: AligoTextTarget[],
  ): Promise<AligoBulkSendResult> {
    // 타입 안전한 방식으로 동적 필드 생성
    const dynamicDto: AligoBulkSendDto = {
      ...baseDto,
      sender: baseDto.sender.replace(/[^0-9]/g, ''),
    };
    targets.forEach((target, index) => {
      const idx = index + 1;
      (dynamicDto as any)[`rec_${idx}`] = target.phone.replace(/[^0-9]/g, '');
      (dynamicDto as any)[`msg_${idx}`] = target.body;
    });
    console.log(`dynamicDto`, dynamicDto);

    return this.postRequest(
      dynamicDto,
      '/send_mass/',
    ) as unknown as Promise<AligoBulkSendResult>;
  }

  /**
   * FCM 서비스와 유사한 방식으로 대량 메시지 발송을 처리하는 래퍼 메서드
   * AligoTextTarget 배열을 받아서 500개씩 chunking하여 sendBulk를 호출
   */
  async sendBulkWrapper(
    baseDto: AligoBulkSendBaseDto,
    targets: AligoTextTarget[],
  ): Promise<AligoWrapperResult> {
    if (!targets || targets.length === 0) {
      throw new BadRequestException(HttpErrorConstants.VALIDATE_ERROR);
    }
    const validTargets = targets.filter(
      (target) =>
        target.phone &&
        target.phone.trim() &&
        target.body &&
        target.body.trim(),
    );
    if (validTargets.length === 0) {
      throw new BadRequestException(HttpErrorConstants.VALIDATE_ERROR);
    }

    this.logger.log(`Starting bulk send to ${validTargets.length} targets`);

    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    let failedBatches = 0;

    const responses: AligoBulkSendResult[] = [];

    // 타겟을 500개씩 chunking
    const targetBatches = this.chunkArray(
      validTargets,
      this.MAX_PHONES_PER_BATCH,
    );

    for (let i = 0; i < targetBatches.length; i++) {
      const batch = targetBatches[i];
      this.logger.log(
        `Processing batch ${i + 1}/${targetBatches.length} with ${batch.length} targets`,
      );

      try {
        const response = await this.sendBulk(baseDto, batch);
        responses.push(response);

        // Aligo API 응답에서 성공/실패 카운트 추출
        if (Number(response.result_code) === 1) {
          totalSuccessCount += response.success_cnt || 0;
          totalFailureCount += response.error_cnt || 0;
          this.logger.log(
            `Batch ${i + 1} completed - Success: ${response.success_cnt}, Error: ${response.error_cnt}`,
          );
        } else {
          // API 호출은 성공했지만 result_code가 1이 아닌 경우
          this.logger.error(
            `Batch ${i + 1} failed with result_code: ${response.result_code}, message: ${response.message}`,
          );
          totalFailureCount += batch.length;
          failedBatches++;
        }

        // 배치 간 딜레이 (API rate limiting 방지)
        if (i < targetBatches.length - 1) {
          await this.delay(this.RETRY_DELAY_MS);
        }
      } catch (error) {
        this.logger.error(`Batch ${i + 1} failed completely:`, error);
        totalFailureCount += batch.length;
        failedBatches++;

        // 에러 응답도 기록 (디버깅용)
        responses.push({
          result_code: -1,
          message: error.message || 'Unknown error',
          msg_id: 0,
          success_cnt: 0,
          error_cnt: batch.length,
          msg_type: baseDto.msg_type || 'SMS',
        });
      }
    }

    const result: AligoWrapperResult = {
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
      failedBatches,
      responses,
    };

    this.logger.log(
      `Bulk send completed - Total Success: ${totalSuccessCount}, Total Failure: ${totalFailureCount}, Failed Batches: ${failedBatches}`,
    );

    return result;
  }

  /**
   * 문자전송결과보기
   */
  async list(
    data: {
      page?: number;
      page_size?: number;
      start_date?: string;
      limit_day?: number;
    } = {},
  ): Promise<any> {
    return this.postRequest(data, '/list/');
  }

  /**
   * 문자전송결과보기 상세
   */
  async detail(data: {
    mid: string;
    page?: number;
    page_size?: number;
  }): Promise<any> {
    return this.postRequest(data, '/sms_list/');
  }

  /**
   * 문자발송가능건수
   */
  async remain(): Promise<any> {
    return this.postRequest({}, '/remain/');
  }

  /**
   * 문자예약취소
   */
  async cancel(data: { mid: string }): Promise<any> {
    return this.postRequest(data, '/cancel/');
  }

  /**
   * 배열을 지정된 크기로 분할하는 유틸리티 메서드 (FCM 서비스와 동일)
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 딜레이를 위한 유틸리티 메서드 (FCM 서비스와 동일)
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
