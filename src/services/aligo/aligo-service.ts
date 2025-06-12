import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ZPLAY_SEOUL_NUMBER } from 'src/common/constants';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { chunk } from 'src/helpers/array';
import {
  BroadcastSmsMessage,
  MultiSmsMessages,
  NotificationResult,
  SingleSmsMessage,
} from 'src/services/notification/types';

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

  async sendSingleMessage(
    message: SingleSmsMessage,
    sender?: string,
  ): Promise<NotificationResult> {
    try {
      const result = await this.send({
        sender: sender || ZPLAY_SEOUL_NUMBER,
        receiver: message.phone,
        msg: message.body,
        // msg_type: 'SMS',
        title: message.title,
      });

      return {
        success: Number(result.result_code) === 1,
        error:
          Number(result.result_code) !== 1
            ? new Error(String(result.message) || 'Aligo send failed')
            : undefined,
        id: message.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        id: message.id,
      };
    }
  }

  async sendBroadcastMessage(
    message: BroadcastSmsMessage,
    sender?: string,
  ): Promise<NotificationResult[]> {
    const dtos = message.phonePairs.map((pair) => ({
      phone: pair.phone,
      title: message.title,
      body: message.body,
      id: pair.id,
    }));
    const baseDto = {
      sender: sender || ZPLAY_SEOUL_NUMBER,
      // msg_type: 'SMS',
    };

    const batches = chunk(dtos, this.MAX_PHONES_PER_BATCH);
    const results: NotificationResult[] = [];

    for (const batch of batches) {
      try {
        const response = await this.sendBulk(baseDto, batch);

        // Aligo는 배치 단위로 응답하므로 각 phone에 대해 동일한 결과 적용
        batch.forEach((v) => {
          results.push({
            success: Number(response.result_code) === 1,
            error:
              Number(response.result_code) !== 1
                ? new Error(String(response.message) || 'Aligo send failed')
                : undefined,
            id: v.id,
          });
        });

        if (batches.length > 1) {
          await this.delay(this.RETRY_DELAY_MS);
        }
      } catch (error) {
        batch.forEach((v) => {
          results.push({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            id: v.id,
          });
        });
      }
    }

    return results;
  }

  async sendMultipleMessages(
    messages: MultiSmsMessages,
    sender?: string,
  ): Promise<NotificationResult[]> {
    const dtos = messages.messages.map((message) => ({
      phone: message.phone,
      title: message.title,
      body: message.body,
      id: message.id,
    }));
    const baseDto = {
      sender: sender || ZPLAY_SEOUL_NUMBER,
      // msg_type: 'SMS',
    };

    const batches = chunk(dtos, this.MAX_PHONES_PER_BATCH);
    const results: NotificationResult[] = [];

    for (const batch of batches) {
      try {
        const response = await this.sendBulk(baseDto, batch);

        // Aligo는 배치 단위로 응답하므로 각 phone에 대해 동일한 결과 적용
        batch.forEach((v) => {
          results.push({
            success: Number(response.result_code) === 1,
            error:
              Number(response.result_code) !== 1
                ? new Error(String(response.message) || 'Aligo send failed')
                : undefined,
            id: v.id,
          });
        });

        if (batches.length > 1) {
          await this.delay(this.RETRY_DELAY_MS);
        }
      } catch (error) {
        batch.forEach((v) => {
          results.push({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            id: v.id,
          });
        });
      }
    }

    return results;
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
      throw new BadRequestException(HttpErrorConstants.ALIGO_FAILED);
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
    };

    targets.forEach((target, index) => {
      const idx = index + 1;
      dynamicDto[`rec_${idx}`] = target.phone.replace(/[^0-9]/g, '');
      dynamicDto[`msg_${idx}`] = target.body;
    });

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
