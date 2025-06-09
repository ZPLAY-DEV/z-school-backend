import { KnownBlock } from '@slack/types';
import { WebClient as SlackWebClient } from '@slack/web-api';

export type SlackMessageOptions = {
  channel?: 'activity' | 'error';
  text?: string;
  attachments?: MessageAttachment[]; // 있어도 상관없지만 지금은 blocks로 갈거야
  blocks?: KnownBlock[]; // << 이 줄 추가해줘야 해!
};

export type SlackClient = {
  chat: {
    postMessage: (params: SlackMessageParams) => Promise<any>;
  };
};

export type WebClient = SlackWebClient & SlackClient;
