/**
 * @param ALL_STUDENT 모든 학생
 * @param ALL_SAM 모든 강사
 * @param GRADE 학년 ( 특정 학년 대상 )
 * @param GRADE_CLASS 반 ( 특정 반 대상 )
 * @param GROUP_STUDENT 그룹 학생 ( 특정 수업(그룹)을 수강중인 학생 대상 )
 * @param GROUP_SAM 그룹 강사 ( 특정 수업(그룹)을 강의중인 강사 대상 )
 */
export enum NotificationTarget {
  ALL_STUDENT = 'ALL_STUDENT',
  ALL_SAM = 'ALL_SAM',
  GRADE = 'GRADE',
  GRADE_CLASS = 'GRADE_CLASS',
  GROUP_STUDENT = 'GROUP_STUDENT',
  GROUP_SAM = 'GROUP_SAM',
}

/**
 * @param ENROLLMENT 수강신청
 * @param ANNOUNCEMENT 공지사항
 * @param SURVEY 설문조사
 */
export enum NotificationType {
  ENROLLMENT = 'ENROLLMENT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  SURVEY = 'SURVEY',
}

/**
 * @param SMS 문자
 * @param FCM 푸시
 */
export enum NotificationPlatform {
  SMS = 'SMS',
  FCM = 'FCM',
}

/**
 * @param READY 대기
 * @param SUCCESS 성공
 * @param FAILED 실패
 */
export enum NotificationStatus {
  READY = 'READY',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
