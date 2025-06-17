import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ZPLAY_SEOUL_NUMBER } from 'src/common/constants';
import { chunk } from 'src/helpers/array';
import { delay } from 'src/helpers/time';
import {
  BroadcastSmsMessage,
  MultiSmsMessages,
  NotificationResult,
  SingleSmsMessage,
} from 'src/services/notification/types';

export interface SmsBatchResult {
  results: NotificationResult[];
  failedPhones: string[];
  successCount: number;
  failureCount: number;
}

@Injectable()
export class AligoService {
  private readonly logger = new Logger(AligoService.name);
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

  async sendSingleMessageToSingleDestination(
    data: SingleSmsMessage,
    sender?: string,
  ): Promise<SmsBatchResult> {
    try {
      const result = await this.send({
        sender: sender || ZPLAY_SEOUL_NUMBER,
        receiver: data.phone,
        msg: data.body,
        msg_type: 'SMS',
        title: data.title,
      });

      return {
        results: [
          {
            success: Number(result.result_code) === 1,
            id: data.id,
          },
        ],
        failedPhones: [],
        successCount: 1,
        failureCount: 0,
      };
    } catch (error) {
      return {
        results: [
          {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            id: data.id,
          },
        ],
        failedPhones: [data.phone],
        successCount: 1,
        failureCount: 0,
      };
    }
  }

  async sendSingleMessageToMultipleDestinations(
    data: BroadcastSmsMessage,
    sender?: string,
  ): Promise<SmsBatchResult> {
    const dtos = data.phonePairs.map((pair) => ({
      phone: pair.phone,
      title: data.title,
      body: data.body,
      id: pair.id,
    }));
    const baseDto = {
      sender: sender || ZPLAY_SEOUL_NUMBER,
      msg_type: 'SMS',
    };

    const batches = chunk(dtos, 500);
    const results: NotificationResult[] = [];
    const failedPhones: string[] = [];
    const batchIds: number[] = [];
    let numberOfSuccess: number = 0;
    let numberOfFailure: number = 0;

    for (const [index, batch] of batches.entries()) {
      try {
        const bulkResponse = await this.sendBulk(baseDto, batch);
        const messageId = Number(bulkResponse.msg_id);

        numberOfSuccess += Number(bulkResponse.success_cnt) || 0;
        numberOfFailure += Number(bulkResponse.error_cnt) || 0;
        batchIds.push(messageId);

        if (index < batches.length - 1) {
          // delay between batches to avoid rate limiting
          await delay(100);
        }
      } catch (error) {
        numberOfFailure += batch.length;
        batch.forEach((v) => {
          failedPhones.push(v.phone);
          results.push({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            id: v.id,
          });
        });
      }
    }

    // 성공한 경우만 배치 ID를 사용하여 상세 조회
    for (const batchId of batchIds) {
      try {
        const detailResponse = await this.detail({
          mid: batchId,
          page: 1,
          page_size: 500,
        });
        const list = detailResponse.list || [];

        list.forEach((v) => {
          results.push({
            success: v.sms_state === '발송완료',
            error:
              v.sms_state !== '발송완료'
                ? new Error(String(v.sms_state) || 'Aligo send failed')
                : undefined,
            id: v.id,
          });
          if (v.sms_state !== '발송완료') {
            failedPhones.push(v.receiver as string);
          }
        });
      } catch (error) {
        this.logger.error(
          `Failed to fetch details for batch ID ${batchId}`,
          error,
        );
      }
    }

    return {
      results,
      failedPhones,
      successCount: numberOfSuccess,
      failureCount: numberOfFailure,
    };
  }

  async sendMultipleMessagesToMultipleDestinations(
    data: MultiSmsMessages,
    sender?: string,
  ): Promise<SmsBatchResult> {
    const dtos = data.messages.map((message) => ({
      phone: message.phone,
      title: message.title,
      body: message.body,
      id: message.id,
    }));
    const baseDto = {
      sender: sender || ZPLAY_SEOUL_NUMBER,
      msg_type: 'SMS',
    };

    const batches = chunk(dtos, 500);
    const results: NotificationResult[] = [];
    const failedPhones: string[] = [];
    const batchIds: number[] = [];
    let numberOfSuccess: number = 0;
    let numberOfFailure: number = 0;

    for (const [index, batch] of batches.entries()) {
      try {
        const bulkResponse = await this.sendBulk(baseDto, batch);
        console.log(`🔥 bulkResponse: ${JSON.stringify(bulkResponse)}`);
        const messageId = Number(bulkResponse.msg_id);

        numberOfSuccess += Number(bulkResponse.success_cnt) || 0;
        numberOfFailure += Number(bulkResponse.error_cnt) || 0;
        batchIds.push(messageId);

        if (index < batches.length - 1) {
          // delay between batches to avoid rate limiting
          await delay(100);
        }
      } catch (error) {
        numberOfFailure += batch.length;
        batch.forEach((v) => {
          failedPhones.push(v.phone);
          results.push({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            id: v.id,
          });
        });
      }
    }

    // 성공한 경우만 배치 ID를 사용하여 상세 조회
    for (const batchId of batchIds) {
      try {
        const detailResponse = await this.detail({
          mid: batchId,
          page: 1,
          page_size: 500,
        });
        console.log(`🔥 detailResponse: ${JSON.stringify(detailResponse)}`);
        const list = detailResponse.list || [];

        list.forEach((v) => {
          const success =
            v.sms_state === '발송완료' ||
            v.sms_state === '전송완료' ||
            v.sms_state === '발송중' ||
            v.sms_state === '전송중' ||
            v.sms_state === '발송예약' ||
            v.sms_state === '전송예약'; // 알리고 문서가 clear 하지 않다.
          results.push({
            success,
            error: !success
              ? new Error(String(v.sms_state) || 'Aligo send failed')
              : undefined,
            id: v.id,
          });
          if (!success) {
            failedPhones.push(v.receiver as string);
          }
        });
      } catch (error) {
        this.logger.error(
          `Failed to fetch details for batch ID ${batchId}`,
          error,
        );
      }
    }

    return {
      results,
      failedPhones,
      successCount: numberOfSuccess,
      failureCount: numberOfFailure,
    };
  }

  private async postRequest(
    data: Record<string, any>,
    endpoint: string,
  ): Promise<any> {
    const formData = new FormData();

    formData.append('key', this.auth.key);
    formData.append('user_id', this.auth.user_id);

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
      this.logger.error(error);
      throw new BadRequestException(
        `Aligo SMS service call failed: ${error.message}`,
      );
    }
  }

  private async send(dto: {
    sender: string;
    receiver: string;
    msg: string;
    msg_type?: string;
    title?: string;
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

  private async sendBulk(
    baseDto: { sender: string; msg_type?: string },
    targets: Array<{ phone: string; title?: string; body: string; id: number }>,
  ): Promise<any> {
    const dynamicDto: Record<string, any> = {
      ...baseDto,
      sender: baseDto.sender.replace(/[^0-9]/g, ''),
      cnt: targets.length,
      // testmode_yn: 'Y',
    };

    targets.forEach((target, index) => {
      const idx = index + 1;
      dynamicDto[`rec_${idx}`] = target.phone.replace(/[^0-9]/g, '');
      dynamicDto[`msg_${idx}`] = target.body;
    });

    console.log(`🔥 dynamicDto: ${JSON.stringify(dynamicDto)}`);
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
    mid: number;
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
  async cancel(data: { mid: number }): Promise<any> {
    return this.postRequest(data, '/cancel/');
  }
}
