import { NewsletterType } from 'src/common/enums';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';

export function getMobileRoute(
  newsletter: Newsletter,
  studentId: number,
): string {
  const { type, id, termId } = newsletter;
  // const baseUrl = 'https://app.schoolhub.co.kr';
  switch (type) {
    case NewsletterType.REGISTRATION:
      return `/parent/nanoid/${id}?type=REGISTRATION&termId=${termId}&studentId=${studentId}`;
    default:
      return `/parent/nanoid/${id}?type=NOTIFICATION&termId=${termId}&studentId=${studentId}`;
  }
}
