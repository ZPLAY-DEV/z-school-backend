import { add, differenceInMinutes, format, parse } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * duration in minutes
 */
export function getDuration(start: string, end: string): number {
  const startDate = parse(start, 'HH:mm', new Date());
  const endDate = parse(end, 'HH:mm', new Date());
  return differenceInMinutes(endDate, startDate);
}

/**
 * validity 문자열을 Date 객체로 변환
 * 예: "1d", "1h", "1m", "1s"
 */
export function parseValidityToDate(validity?: string): Date {
  if (!validity) {
    // 기본값으로 1일 설정
    return add(new Date(), { days: 1 });
  }

  const now = new Date();
  const match = validity.match(/^(\d+)([dhms])$/);

  if (!match) {
    throw new Error(
      'Invalid validity format. Use format like "1d", "1h", "1m", "1s"',
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return add(now, { days: value });
    case 'h':
      return add(now, { hours: value });
    case 'm':
      return add(now, { minutes: value });
    case 's':
      return add(now, { seconds: value });
    default:
      throw new Error('Invalid validity unit. Use d, h, m, or s');
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert Date to local date string in Korean timezone
 */
export function formatDateInKST(date: Date): string {
  return format(toZonedTime(date, 'Asia/Seoul'), 'yyyy-MM-dd');
}

/**
 * Convert KST Date to UTC Date
 * KST로 입력된 Date 객체를 UTC로 변환하여 반환
 */
export function convertKSTToUTC(kstDate: Date): Date {
  return fromZonedTime(kstDate, 'Asia/Seoul');
}
