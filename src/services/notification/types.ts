import { NotifiableSourceType } from 'src/common/enums/notifiable-source-type';

export type PartitioningMeta = {
  type: NotifiableSourceType;
  schoolId: number; // 학교아이디
};

export type FcmData = {
  role: string; // `PARENT` 또는 `INSTRUCTOR`
  url?: string; // for Client Routing
  routes?: string; // JSON stringified object
};

export type SingleFcmData = {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data: FcmData;
  android: {
    priority: 'high';
    ttl: number;
    notification: {
      priority: 'high';
      defaultSound: boolean;
    };
  };
  apns: {
    payload: {
      aps: {
        badge: number;
        sound: string;
      };
    };
  };
};

export type NotificationResult = {
  success: boolean;
  messageId?: string;
  error?: Error;
  id?: number;
};

export type KakaoMessage = {
  to: string;
  content: string;
  buttons: {
    type: string;
    name: string;
    linkMobile: string;
    linkPc: string;
  }[];
};

export type KakaoAlimtalkData = {
  template: string;
  messages: KakaoMessage[];
};

export type NotificationCoreData = {
  token: string | null;
  phone: string;
  template: string;
  title?: string;
  body: string;
  role: string;
  url?: string;
  routes?: Record<string, string>;
};

export type NotificationFullData = PartitioningMeta & {
  messages: NotificationCoreData[];
};

// SENS (Naver Cloud Platform) 응답 타입
export type SensAlimtalkResult = {
  success: boolean;
  requestId?: string;
  requestTime?: string;
  statusCode?: string;
  statusName?: string;
  messages?: SensReceivedMessage[];
  error?: Error;
};

export type SensReceivedMessage = {
  messageId?: string;
  to?: string;
  countryCode?: string;
  content?: string;
  requestStatusCode?: string;
  requestStatusName?: string;
  requestStatusDesc?: string;
  useSmsFailover?: boolean;
};

// 통합된 알림 발송 결과 타입
export type NotificationSendResult = {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  channels: {
    fcm?: FcmChannelResult;
    kakao?: KakaoChannelResult;
  };
  errors?: Error[];
};

export type FcmChannelResult = {
  success: boolean;
  sent: number;
  failed: number;
  invalidTokens: string[];
  results: NotificationResult[];
};

export type KakaoChannelResult = {
  success: boolean;
  sent: number;
  failed: number;
  smsFailoverCount: number;
  requestId?: string;
  statusCode?: string;
  statusName?: string;
  messages?: SensReceivedMessage[];
  error?: Error;
};
