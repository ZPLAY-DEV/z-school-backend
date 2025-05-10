export enum SupportStatus {
  NONE = 'none',
  REQUESTED = 'requested', // 반품 또는 환불 요청
  REVIEWING = 'reviewing', // 관리자 검토중
  DONE_TOTAL_LOSS = 'done_total_loss', // 환불 (전손)
  DONE_PARTIAL_LOSS = 'done_partial_loss', // 취소 (부분손실)
  DONE_SETTLED = 'done_settled', // 원산지 책임 교환 (no 손해)
}
