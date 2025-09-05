import { SendAlimtalkCommand, SensClient } from '@ingestkorea/client-sens';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizePhone } from 'src/helpers/phone';
import {
  KakaoAlimtalkData,
  SensAlimtalkResult,
} from 'src/services/notification/types';

@Injectable()
export class SensService {
  private readonly logger = new Logger(SensService.name);
  private sensClient: SensClient;
  private channelId: string;

  whitelist = [
    '01089072911', // boss
    '01094867415', // chuck
    '01020440571', // jason
    '01093924027', // minji
    '01020239567', // lim
  ];

  constructor(private configService: ConfigService) {
    this.sensClient = new SensClient({
      credentials: {
        accessKey: this.configService.get<string>('ncloud.accessKey')!,
        secretKey: this.configService.get<string>('ncloud.secretKey')!,
      },
      serviceId: {
        sms: this.configService.get<string>('ncloud.smsServiceId'),
        kakao: this.configService.get<string>('ncloud.kakaoServiceId'),
      },
    });
    this.channelId = this.configService.get<string>('ncloud.kakaoChannelId')!;
  }

  async sendAlimtalk(
    dto: KakaoAlimtalkData,
    whitelistOnly: boolean = false,
  ): Promise<SensAlimtalkResult> {
    if (whitelistOnly) {
      const whitelistedMessages = dto.messages.filter((message) =>
        this.whitelist.includes(normalizePhone(message.to)!),
      );

      if (whitelistedMessages.length === 0) {
        this.logger.warn(
          '😮‍💨 화이트리스트에 등록된 번호가 없어 메시지를 발송하지 않습니다.',
        );
        return {
          success: false,
          error: new Error('No whitelisted phone numbers found'),
        };
      }

      dto.messages = whitelistedMessages;
    }
    try {
      const command = new SendAlimtalkCommand({
        plusFriendId: this.channelId,
        templateCode: dto.template,
        messages: dto.messages as any,
      });

      const response = await this.sensClient.send(command);

      // 응답 처리
      const result: SensAlimtalkResult = {
        success: response.statusCode === '202' || response.statusCode === '200',
        requestId: response.requestId,
        requestTime: response.requestTime,
        statusCode: response.statusCode,
        statusName: response.statusName,
        messages: response.messages,
      };

      // SMS 대체 발송 여부 확인
      if (response.messages) {
        const smsFailoverCount = response.messages.filter(
          (msg) => msg.useSmsFailover,
        ).length;
        if (smsFailoverCount > 0) {
          this.logger.warn(
            `${smsFailoverCount}개 메시지가 SMS로 대체 발송되었습니다.`,
          );
        }
      }

      this.logger.log(
        `알림톡 발송 완료 - RequestId: ${response.requestId}, Status: ${response.statusCode}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`🔴 Error sending Alimtalk:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
