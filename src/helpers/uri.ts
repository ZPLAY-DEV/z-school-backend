import { NewsletterType } from 'src/common/enums';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';

export function getMobileRoute(newsletter: Newsletter): string {
  const { type, id, termId } = newsletter;
  // const baseUrl = 'https://app.schoolhub.co.kr';
  switch (type) {
    case NewsletterType.REGISTRATION:
      return `/parent/offerings/${id}`;
    default:
      return `/parent/notification`;
  }
}
