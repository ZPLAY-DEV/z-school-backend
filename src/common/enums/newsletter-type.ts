export enum NewsletterTarget {
  SCHOOL = 'SCHOOL', // 학교 전체
  GRADE = 'GRADE', // 학년선택가능
  LESSON = 'LESSON', // 과목선택가능
  GROUP = 'GROUP', // 반선택가능
  STUDENT = 'STUDENT', // 기타 학생 아이디로 지정
}

export enum NewsletterType {
  NEWS = 'NEWS',
  SURVEY = 'SURVEY',
  REGISTRATION = 'REGISTRATION',
}

// ex) NewsletterTypeLabels[NewsletterType.RESUME] returns "이력서"
// export const NewsletterTypeLabels: Record<NewsletterType, string> = {
//   [NewsletterType.REGISTRATION]: '수강신청',
//   [NewsletterType.NEWS]: '공지사항',
//   [NewsletterType.SURVEY]: '설문조사',
// };
