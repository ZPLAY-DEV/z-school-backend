import { WebClient as SlackWebClient } from '@slack/web-api';

export interface SlackMessageParams {
  channel: string;
  text?: string;
  attachments?: any[];
}

export interface SlackClient {
  chat: {
    postMessage: (params: SlackMessageParams) => Promise<any>;
  };
}

export type WebClient = SlackWebClient & SlackClient;
