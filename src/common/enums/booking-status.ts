export enum BookingStatus {
  // ok
  ENROLLED = 'enrolled', // 확정
  PENDING = 'pending', // 대기
  // err
  BOOKED = 'booked', // 이미 신청했음
  FULL = 'full', // 마감
  ERROR = 'error', // 500 오류 (DB, Redis 등)
}
