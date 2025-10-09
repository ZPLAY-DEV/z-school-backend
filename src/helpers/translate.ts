import { Actor, NewsletterType, NotifiableTarget } from 'src/common/enums';

export const translateNewsletterType = (type: NewsletterType): string => {
  switch (type) {
    case NewsletterType.CHANGES:
      return '수업 일정 안내';
    case NewsletterType.MANAGEMENT:
      return '수업 운영 안내';
    case NewsletterType.RESULT:
      return '수강 신청 결과';
    case NewsletterType.SUPPLIES:
      return '수업 준비물 안내';
    default:
      return '기타';
  }
};

export const translateNotifiableTarget = (
  type: NotifiableTarget | null,
): string => {
  switch (type) {
    case NotifiableTarget.SCHOOL:
      return '전체';
    case NotifiableTarget.GRADE:
      return '학년';
    case NotifiableTarget.LESSON:
      return '강좌';
    case NotifiableTarget.GROUP:
      return '분반';
    case NotifiableTarget.STUDENT:
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
      return '관리자';
    default:
      return '기타';
  }
};
