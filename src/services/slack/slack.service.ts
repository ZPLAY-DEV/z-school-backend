import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatPostMessageArguments,
  WebClient as SlackClient,
} from '@slack/web-api';

@Injectable()
export class SlackService {
  private slack: SlackClient;

  constructor(private configService: ConfigService) {
    this.slack = new SlackClient(this.configService.get<string>('slack.token'));
  }

  async sendMessage(
    options: Partial<ChatPostMessageArguments> & { blocks?: any },
  ) {
    try {
      const channelId = this.getChannelId(options.channel ?? 'activity');
      console.log('😀 Slack 전송 시도', {
        channel: channelId,
        text: options.text,
        blocks: options.blocks,
      });
      await this.slack.chat.postMessage({
        channel: channelId,
        text: options.text,
        blocks: options.blocks,
      });
    } catch (error) {
      console.error(
        `🔴 Error sending Slack message to ${options.channel} channel:`,
        error,
      );
    }
  }

  private getChannelId(channel: string): string {
    const channelId =
      channel === 'error'
        ? this.configService.get<string>('slack.errorChannel')
        : this.configService.get<string>('slack.activityChannel');

    if (!channelId) {
      throw new Error(
        `Channel ID for ${channel} not found! Check your config.`,
      );
    }

    return channelId;
  }
}
