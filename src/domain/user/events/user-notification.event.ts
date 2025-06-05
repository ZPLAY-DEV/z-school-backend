import { IData } from 'src/common/interfaces';

export class UserNotificationEvent {
  name: 'alarm' | 'support' | 'delivery' | 'user';
  userId: number; // 수신 대상 사용자 아이디
  token: string | null; // 수신 대상 사용자 토큰
  title?: string; // 제목
  body: string;
  data: IData;

  constructor(init?: Partial<UserNotificationEvent>) {
    Object.assign(this, init);
  }
}
