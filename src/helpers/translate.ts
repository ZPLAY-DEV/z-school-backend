import { NewsletterType } from 'src/common/enums/newsletter-type';

export const translateNewsletterType = (type: NewsletterType): string => {
  switch (type) {
    case NewsletterType.REGISTRATION:
      return '수강신청';
    case NewsletterType.NEWS:
      return '공지사항';
    case NewsletterType.SURVEY:
      return '설문조사';
    default:
      return '기타';
  }
};
