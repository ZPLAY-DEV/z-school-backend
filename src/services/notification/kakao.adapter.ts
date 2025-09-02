import {
  KakaoAlimtalkData,
  KakaoMessage,
  NotificationCoreData,
} from 'src/services/notification/types';

// Kakao 알림톡 변환기
export class KakaoAdapter {
  static toPayload(msgs: NotificationCoreData[]): KakaoAlimtalkData {
    return {
      template: msgs[0].template,
      messages: msgs.map((msg) => {
        return {
          to: msg.phone,
          content: msg.body,
          buttons: [
            {
              type: 'WL',
              name: '스쿨허브',
              linkMobile: `https://app.schoolhub.co.kr`,
              linkPc: `https://app.schoolhub.co.kr`,
            },
          ],
        } as KakaoMessage;
      }),
    };
  }
}
