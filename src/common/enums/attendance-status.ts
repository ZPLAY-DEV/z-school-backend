export enum AttendanceStatus {
  PENDING = 'PENDING', // 이전상태
  PRESENT = 'PRESENT', // 출석/종료
  ABSENT = 'ABSENT', // 결석
  LATE = 'LATE', // 지각
  LEFT = 'LEFT', // 조퇴
  EXCUSED_ABSENT = 'EXCUSED_ABSENT', // 결석 선통보
  EXCUSED_LATE = 'EXCUSED_LATE', // 지각 선통보
  EXCUSED_LEFT = 'EXCUSED_LEFT', // 조퇴 선통보
}
