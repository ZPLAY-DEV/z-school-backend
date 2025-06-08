// 대량 알림 요청 (여러 수신자에게 동일한 메시지)
export type BulkNotificationRequest = {
  messageType: string; // ping.class, ping.exit, letter.registration, letter.survey, letter.notice
  title?: string;
  body: string;
  target?: string; // for Client Routing
  targetId?: string; // for Client Routing
  ids: number[]; // parentIds 또는 instructorIds
  role: string; // PARENT 또는 INSTRUCTOR
  schoolId: number;
};

// 개별 알림 아이템
export type IndividualNotification = {
  id: number; // parentId or instructorId
  title?: string;
  body: string;
  target?: string; // for Client Routing
  targetId?: string; // for Client Routing
};

// 개별화된 알림 요청 (각 수신자별 다른 메시지)
export type IndividualNotificationRequest = {
  messageType: string;
  notifications: IndividualNotification[]; // 각 수신자별 개별 메시지
  role: string; // PARENT 또는 INSTRUCTOR
  schoolId: number;
};

export type NotificationResult = {
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
