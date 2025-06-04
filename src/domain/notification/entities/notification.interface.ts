import {
  NotificationPlatform,
  NotificationStatus,
  NotificationType,
} from 'src/common/enums';

export interface INotificationKey {
  notificationKey: string; // partitionKey ENROLLMENT#1,ANNOUNCEMENT#4, SURVEY#2
  targetKey: string; // sortKey  SCHOOL#schoolId#STUDENT#studentId or SCHOOL#schoolId#SAM#samId ex) SCHOOL#1#STUDENT#101, SCHOOL#1#SAM#59
}

export interface INotification extends INotificationKey {
  notificationId: number;
  targetId: number; // studentId or samId
  type: NotificationType;
  sentAt?: number;
  status?: NotificationStatus;
  phone: string;
  requestId?: string;
  isRead?: boolean;
  platform: NotificationPlatform;
  createdAt?: number;
  updatedAt?: number;
}
