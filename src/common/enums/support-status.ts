export enum SupportStatus {
  NONE = 'NONE',
  REQUESTED = 'REQUESTED', // 반품 또는 환불 요청
  REVIEWING = 'REVIEWING', // 관리자 검토중
  DONE_TOTAL_LOSS = 'DONE_TOTAL_LOSS', // 환불 (전손)
  DONE_PARTIAL_LOSS = 'DONE_PARTIAL_LOSS', // 취소 (부분손실)
  DONE_SETTLED = 'DONE_SETTLED', // 원산지 책임 교환 (no 손해)
}
