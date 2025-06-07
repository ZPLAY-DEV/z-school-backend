export type AligoListResult = {
  mid: string;
  type: string;
  sender: string;
  sms_count: string;
  reserve_state: string;
  msg: string;
  fail_count: string;
  reg_date: string;
  reserve: string;
};

export type AligoBulkSendResult = {
  result_code: number;
  message: string;
  msg_id: number;
  success_cnt: number;
  error_cnt: number;
  msg_type: string;
};

export type AligoWrapperResult = {
  successCount: number;
  failureCount: number;
  failedBatches: number;
  responses: AligoBulkSendResult[];
};

// 개별 알림 아이템
export type AligoTextTarget = {
  phone: string;
  body: string;
};

// 기본 필드 타입 정의
export type AligoBulkSendBaseDto = {
  sender: string;
  msg_type?: string;
  cnt: number;
  title?: string; // 제목 (미사용)
  rdate?: string; // 예약일 (미사용)
  rtime?: string; // 예약시간 (미사용)
  testmode_yn?: string; // dryrun 여부
};

// 동적 필드를 위한 타입 (rec_1, msg_1, rec_2, msg_2, ...)
export type DynamicBulkFields = {
  [K in `rec_${number}` | `msg_${number}`]: string;
};

// 최종 DTO 타입 (기본 필드 + 동적 필드)
export type AligoBulkSendDto = AligoBulkSendBaseDto &
  Partial<DynamicBulkFields>;
