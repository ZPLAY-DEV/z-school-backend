export type NotifyParentsParams = {
  messageType: string; // ping.class, ping.exit, letter.registration, letter.survey, letter.notice
  parentIds: number[];
  schoolId: number;
  schoolName: string;
  title?: string;
  body: string;
  role: string; // INSTRUCTOR, PARENT, OTHER
  target?: string; // for Client Routing
  targetId?: string; // for Client Routing
  senderPhone: string; // SMS 발송자 school.phone 번호 (pushToken이 없는 사용자를 위해)
};

export type NotifyUsersParams = {
  messageType: string; // ping.class, ping.exit, letter.registration, letter.survey, letter.notice
  userIds: number[];
  schoolId: number;
  schoolName: string;
  title?: string;
  body: string;
  role: string; // INSTRUCTOR, PARENT, OTHER
  target?: string; // for Client Routing
  targetId?: string; // for Client Routing
  senderPhone: string; // SMS 발송자 school.phone 번호 (pushToken이 없는 사용자를 위해)
};

export type LogResult = {
  success: boolean;
  error?: Error;
  retryable?: boolean; // 재시도 가능한 에러인지 표시
};

// TODO: 향후 메트릭 서비스 추가 시 사용
// export type MetricsService = {
//   incrementCounter(metric: string, tags?: Record<string, string>): void;
//   recordLatency(metric: string, duration: number, tags?: Record<string, string>): void;
// };

// TODO: 향후 fallback 저장소 추가 시 사용
// export type FallbackLogStorage = {
//   save(logData: any): Promise<void>;
// };
