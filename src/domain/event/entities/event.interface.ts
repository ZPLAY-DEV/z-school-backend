import { EventStatus } from 'src/common/enums';

export interface IEventKey {
  eventKey: string; // "SCHOOL#{schoolId}#NEWSLETTER#{newsletterId}" 형태
  timestamp: string; // range key, ISO 8601 UTC format: "2025-05-01T14:00:00Z"
}

export interface IEvent extends IEventKey {
  type: string; // e.g. "REGISTRATION"
  newsletterId: number; // 조회 편의를 위해 별도 필드로 유지
  schoolId: number; // 조회 편의를 위해 별도 필드로 유지
  status: EventStatus;
  payload: any;
  isRead?: boolean;
  expires?: number; // for TTL
}

// Cron job related types
// export type CronJobType = 'every_5mins' | 'everyday_at_1am' | 'everyday_at_2am';
