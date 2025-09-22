export enum NewsletterTarget {
  SCHOOL = 'SCHOOL', // 학교 전체
  GRADE = 'GRADE', // 학년선택가능
  LESSON = 'LESSON', // 과목선택가능
  GROUP = 'GROUP', // 반선택가능
  STUDENT = 'STUDENT', // 기타 학생 아이디로 지정
}

export enum NewsletterType {
  REGISTRATION = 'REGISTRATION',
  CHANGES = 'CHANGES', // 수업 일정 안내
  MANAGEMENT = 'MANAGEMENT', // 수업 운영 안내
  RESULT = 'RESULT', // 수강 신청 결과
  SUPPLIES = 'SUPPLIES', // 수업 준비물 안내
}
