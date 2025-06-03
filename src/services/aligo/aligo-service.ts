import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import {
  BaseBulkMessageDto,
  BulkMessageDto,
  BulkMessageItem,
} from 'src/domain/text/types/text.types';

@Injectable()
export class AligoService {
  private readonly baseUrl: string;
  private readonly auth: {
    key: string;
    user_id: string;
  };

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
  async sendBulkMessages(
    baseDto: BaseBulkMessageDto,
    messages: BulkMessageItem[],
  ): Promise<any> {
    // 타입 안전한 방식으로 동적 필드 생성
    const dynamicDto: BulkMessageDto = {
      ...baseDto,
      sender: baseDto.sender.replace(/[^0-9]/g, ''),
    };
    messages.forEach((message, index) => {
      const idx = index + 1;
      (dynamicDto as any)[`rec_${idx}`] = message.receiver.replace(
        /[^0-9]/g,
        '',
      );
      (dynamicDto as any)[`msg_${idx}`] = message.message;
    });
    console.log(`dynamicDto`, dynamicDto);

    return this.postRequest(dynamicDto, '/send_mass/');
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
}
