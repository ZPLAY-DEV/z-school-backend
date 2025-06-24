export enum NewsletterTarget {
  SCHOOL = 'SCHOOL', // 학교 전체
  GRADE = 'GRADE', // 학년선택가능
  LESSON = 'LESSON', // 과목선택가능
  GROUP = 'GROUP', // 반선택가능
  OTHER = 'OTHER', // 기타 학생 아이디로 지정
}

export enum NewsletterStatus {
  READY = 'READY',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum NewsletterType {
  REGISTRATION = 'REGISTRATION',
  NEWS = 'NEWS',
  SURVEY = 'SURVEY',
}

// ex) NewsletterTypeLabels[NewsletterType.RESUME] returns "이력서"
// export const NewsletterTypeLabels: Record<NewsletterType, string> = {
//   [NewsletterType.REGISTRATION]: '수강신청',
//   [NewsletterType.NEWS]: '공지사항',
//   [NewsletterType.SURVEY]: '설문조사',
// };
