import { AlarmType } from 'src/common/enums';
import { IData } from 'src/common/interfaces';

export interface IAlarmKey {
  userId: number; // partition key
  id: string | null; // sort key
}

export interface ISender {
  username: string;
  avatar: string;
  gender: 'male' | 'female' | null;
  userId: number;
  age: number | null;
}

export interface IAlarm extends IAlarmKey {
  alarmType: AlarmType;
  message: string;
  data: IData;
  link: string | null;
  user: ISender | null;
  isRead: boolean;
  expires?: number;
  createdAt?: number;
  updatedAt?: number;
}
