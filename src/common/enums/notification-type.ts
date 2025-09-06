import { NewsletterType } from './newsletter-type';

export enum AlarmType {
  SCHOOL = 'SCHOOL',
  CLASS = 'CLASS',
  OTHER = 'OTHER',
}

export type NotificationType = AlarmType | NewsletterType;
