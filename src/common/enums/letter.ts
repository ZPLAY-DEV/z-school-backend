export enum NewsletterType {
  ENROLLMENT = 'ENROLLMENT',
  NEWS = 'NEWS',
  SURVEY = 'SURVEY',
}

export enum NewsletterTarget {
  GRADE = '학년별',
  LESSON = '강좌별',
  STUDENT = '학생별',
}

export enum NewsletterStatus {
  READY = 'READY',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum SendMode {
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED = 'SCHEDULED',
  DRAFT = 'DRAFT',
}
