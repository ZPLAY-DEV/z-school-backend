import {
  NotificationCoreData,
  SingleFcmData,
} from 'src/services/notification/types';

// FCM 변환기
export class FcmAdapter {
  static toPayload(msg: NotificationCoreData): SingleFcmData {
    // Ensure FCM data payload contains only string values
    const data: {
      role: string;
      url?: string;
      routes?: string;
    } = {
      role: String(msg.role),
    };

    if (msg.url != null) {
      data.url = String(msg.url);
    }

    if (msg.routes != null) {
      data.routes = JSON.stringify(msg.routes ?? {});
    }

    return {
      token: msg.token!,
      notification: {
        title: msg.title ?? msg.body?.split('\n')[0] ?? 'n/a',
        body: msg.body,
      },
      data,
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
