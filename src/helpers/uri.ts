import { NewsletterType } from 'src/common/enums';

export function getMobileRoute(
  type: NewsletterType,
  termId: number,
  nanoid: string,
  studentId: number,
): string {
  // const baseUrl = 'https://app.schoolhub.co.kr';
  if (type === NewsletterType.REGISTRATION) {
    return `/parent/nanoid/${nanoid}?type=REGISTRATION&termId=${termId}&studentId=${studentId}`;
  } else {
    return `/parent/nanoid/${nanoid}?type=NOTIFICATION&termId=${termId}&studentId=${studentId}`;
  }
}
