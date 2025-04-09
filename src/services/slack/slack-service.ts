import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageAttachment, WebClient } from '@slack/web-api';

interface SlackMessageOptions {
  channel?: 'activity' | 'error';
  text?: string;
  attachments?: MessageAttachment[];
}

@Injectable()
export class SlackService {
  private slack: WebClient;

  constructor(private configService: ConfigService) {
    this.slack = new WebClient(this.configService.get<string>('slack.token'));
  }

  private getChannelId(channel: string = 'default'): string {
    switch (channel) {
      case 'error':
        return this.configService.get<string>('slack.errorChannel') ?? '';
      default:
        return this.configService.get<string>('slack.activityChannel') ?? '';
    }
  }

  async sendMessage(options: SlackMessageOptions) {
    try {
      const channelId = this.getChannelId(options.channel);
      await this.slack.chat.postMessage({
        channel: channelId,
        text: options.text,
        attachments: options.attachments ?? [],
      });
    } catch (error) {
      console.error(
        `Error sending Slack message to ${options.channel} channel:`,
        error,
      );
    }
  }
}
