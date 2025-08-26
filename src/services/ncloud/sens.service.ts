import { SendAlimtalkCommand, SensClient } from '@ingestkorea/client-sens';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SensService {
  private sensClient: SensClient;
  private channelId: string;

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

  async sendAlimtalk(dto: {
    template: string;
    messages: { to: string; content: any; buttons?: any }[];
  }) {
    try {
      const command = new SendAlimtalkCommand({
        plusFriendId: this.channelId,
        templateCode: dto.template,
        messages: dto.messages,
      });
      await this.sensClient.send(command);
    } catch (error) {
      console.error(`🔴 Error sending Alimtalk:`, error);
    }
  }
}
