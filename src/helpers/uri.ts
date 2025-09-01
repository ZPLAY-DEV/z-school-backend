import { NewsletterType } from 'src/common/enums';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';

export function getMobileRoute(newsletter: Newsletter): string {
  const { type, id } = newsletter;

  if (type === NewsletterType.REGISTRATION) {
    return `parent/offerings/${id}`;
  }

  if (type === NewsletterType.NEWS) {
    return `parent/notification/${id}`;
  }

  return 'parent/notification';
}
