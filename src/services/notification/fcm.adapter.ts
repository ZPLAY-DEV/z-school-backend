import {
  NotificationCoreData,
  SingleFcmData,
} from 'src/services/notification/types';

// FCM 변환기
export class FcmAdapter {
  static toPayload(msg: NotificationCoreData): SingleFcmData {
    return {
      token: msg.token!,
      notification: {
        title: msg.title ?? msg.body?.split('\n')[0] ?? 'n/a',
        body: msg.body,
      },
      data: {
        role: msg.role,
        url: msg.url,
        routes: JSON.stringify(msg.routes ?? {}),
      },
      android: {
        priority: 'high' as const,
        ttl: 60 * 60 * 24, // 24 hours
        notification: {
          priority: 'high' as const,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    };
  }

  static toPayloadArray(messages: NotificationCoreData[]): SingleFcmData[] {
    return messages.map((msg) => this.toPayload(msg));
  }
}
