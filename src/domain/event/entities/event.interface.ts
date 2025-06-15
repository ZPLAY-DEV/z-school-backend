import { EventStatus } from 'src/common/enums';

export interface IEventKey {
  status: EventStatus; // partition key, e.g. "PENDING" | "SENT" | "FAILED"
  timestamp: string; // sort key, ISO 8601 UTC format: "2025-05-01T14:00:00Z"
}

export interface IEvent extends IEventKey {
  type: string; // e.g. "EVERYDAY@2AM" | "EVERYDAY@3AM" | "EVERY_5MINS"
  payload: any;
  expires?: number; // for TTL
}

// Cron job related types
export type CronJobType = 'EVERY_5MINS' | 'EVERYDAY@2AM' | 'EVERYDAY@3AM';

export interface ICronJobEvent extends IEvent {
  type: CronJobType;
  executionTime: string; // ISO 8601 UTC: when this should be executed
}
