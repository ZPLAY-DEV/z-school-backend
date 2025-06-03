import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';

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
    title?: string;
    destination?: string;
    rdate?: string;
    rtime?: string;
    testmode_yn?: string;
  }): Promise<any> {
    return this.postRequest(dto, '/send/');
  }

  /**
   * 문자보내기 대량
   */
  async sendMass(data: {
    sender: string;
    receiver: string;
    msg: string;
    msg_type?: string;
    title?: string;
    destination?: string;
    rdate?: string;
    rtime?: string;
    testmode_yn?: string;
  }): Promise<any> {
    return this.postRequest(data, '/send_mass/');
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
