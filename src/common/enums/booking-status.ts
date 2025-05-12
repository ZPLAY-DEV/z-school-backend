export enum BookingStatus {
  // ok
  ENROLLED = 'ENROLLED', // 확정
  PENDING = 'PENDING', // 대기
  // err
  BOOKED = 'BOOKED', // 이미 신청했음
  FULL = 'FULL', // 마감
  ERROR = 'ERROR', // 500 오류 (DB, REDIS 등)
}
