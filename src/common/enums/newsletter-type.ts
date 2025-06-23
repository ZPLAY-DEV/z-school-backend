export enum NewsletterTarget {
  GRADE = 'GRADE',
  LESSON = 'LESSON',
  GROUP = 'GROUP',
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
