export interface IEventKey {
  eventKey: string; // composite key (규칙: "SCHOOL#{schoolId}#{type}")
  eventTime: number; // unix timestamp
}
export interface IEvent extends IEventKey {
  newsletterId: number; // 조회 편의를 위해 별도 필드로 유지
  status: string; // "SCHEDULED" | "SENT" | "FAILED" | "CANCELED"
  payload: any; // 이벤트 페이로드
  expires?: number; // for TTL
  createdAt?: Date; // Dynamoose timestamps
  updatedAt?: Date; // Dynamoose timestamps
}
