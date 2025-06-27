export interface IEventKey {
  eventKey: string; // "SCHOOL#{schoolId}#NEWSLETTER#{newsletterId}" 형태
  timestamp: string; // range key, ISO 8601 UTC format: "2025-05-01T14:00:00Z"
}

export interface IEvent extends IEventKey {
  type: string; // "REGISTRATION" | "NEWS" | "SURVEY"
  newsletterId: number; // 조회 편의를 위해 별도 필드로 유지
  schoolId: number; // 조회 편의를 위해 별도 필드로 유지
  status: string; // "SCHEDULED" | "SENT" | "FAILED" | "CANCELED"
  payload: any;
  isRead?: boolean;
  expires?: number; // for TTL
}
