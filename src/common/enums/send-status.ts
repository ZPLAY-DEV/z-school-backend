export enum SendStatus {
  INIT = 'INIT', // 미전송
  SENT = 'SENT', // 전송완료
  SCHEDULED = 'SCHEDULED', // 예약전송
  CANCELED = 'CANCELED', // 취소
  FAILED = 'FAILED', // 전송실패
}
