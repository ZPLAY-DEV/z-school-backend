import { Actor } from 'src/common/enums';
import {
  NewsletterTarget,
  NewsletterType,
} from 'src/common/enums/newsletter-type';

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

export const translateNewsletterTarget = (
  type: NewsletterTarget | null,
): string => {
  switch (type) {
    case NewsletterTarget.SCHOOL:
      return '전체';
    case NewsletterTarget.GRADE:
      return '학년';
    case NewsletterTarget.LESSON:
      return '강좌';
    case NewsletterTarget.GROUP:
      return '반';
    case NewsletterTarget.STUDENT:
      return '학생';
    default:
      return '미지정';
  }
};

export const translateActor = (type: Actor | null): string => {
  switch (type) {
    case Actor.INSTRUCTOR:
      return '강사';
    case Actor.MANAGER:
      return '매니저';
    default:
      return '기타';
  }
};
