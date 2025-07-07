export enum BookingStatus {
  ENROLLED = 'ENROLLED', // 확정 (당신은 이 수업 수강생입니다.)
  PENDING = 'PENDING', // 대기 (당신은 이 수업 대기자입니다.)
  FULL = 'FULL', // 마감 (당신은 이 수업 죽어도 못 듣습니다. 일명 나가리)
  CANCELED = 'CANCELED', // 취소
}
