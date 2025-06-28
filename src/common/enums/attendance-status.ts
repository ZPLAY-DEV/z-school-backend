export enum AttendanceStatus {
  INIT = 'INIT', // 시작전
  PRESENT = 'PRESENT', // 출석
  ABSENT = 'ABSENT', // 결석
  LATE = 'LATE', // 지각
  LEFT = 'LEFT', // 조퇴
  EXCUSED_ABSENT = 'EXCUSED_ABSENT', // 선결석통보
  EXCUSED_LATE = 'EXCUSED_LATE', // 선지각통보
  EXCUSED_LEFT = 'EXCUSED_LEFT', // 선조퇴통보
}
