// /**
//  * @param ALL_STUDENT 모든 학생
//  * @param ALL_SAM 모든 강사
//  * @param GRADE 학년 ( 특정 학년 대상 )
//  * @param GRADE_CLASS 반 ( 특정 반 대상 )
//  * @param GROUP_STUDENT 그룹 학생 ( 특정 수업(그룹)을 수강중인 학생 대상 )
//  * @param GROUP_SAM 그룹 강사 ( 특정 수업(그룹)을 강의중인 강사 대상 )
//  */
// export enum DispatchTarget {
//   ALL_STUDENT = 'ALL_STUDENT',
//   ALL_SAM = 'ALL_SAM',
//   GRADE = 'GRADE',
//   GRADE_CLASS = 'GRADE_CLASS',
//   GROUP_STUDENT = 'GROUP_STUDENT',
//   GROUP_SAM = 'GROUP_SAM',
// }

/**
 * @todo 네이밍 target -> tap으로 변경
 * 발송 대상자의 상세 유형
 * @param GRADE 학년별
 * @param COURSE 강좌별
 * @param STUDENT 학생별
 * @param SAM 강사별
 */
export enum MainTarget {
  GRADE = '학년별',
  COURSE = '강좌별',
  STUDENT = '학생별',
  SAM = '강사별',
}

/**
 * @todo NEWS 네이밍 체크
 * @param ENROLLMENT 수강신청
 * @param NEWS 공지사항
 * @param SURVEY 설문조사
 */
export enum DispatchType {
  ENROLLMENT = 'ENROLLMENT',
  NEWS = 'NEWS',
  SURVEY = 'SURVEY',
}

/**
 * @param SMS 문자
 * @param FCM 푸시
 */
export enum DispatchPlatform {
  SMS = 'SMS',
  FCM = 'FCM',
}

/**
 * 발송 상태
 * @param READY 대기
 * @param SUCCESS 성공
 * @param FAILED 실패
 */
export enum DispatchState {
  READY = 'READY',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

/**
 * 발송
 * @param IMMEDIATE 즉시 발송
 * @param SCHEDULED 예약 발송
 * @param DRAFT 등록만 (v3 출시 이후 개선때 사용 예정)
 */
export enum DispatchMode {
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED = 'SCHEDULED',
  DRAFT = 'DRAFT',
}
