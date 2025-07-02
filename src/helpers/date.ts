import { getMonth, getWeek, getYear } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const getLocalDateFromString = (value: string) => {
  return toZonedTime(value, 'Asia/Seoul');
};

export const getMonthNumber = (date: Date): number => {
  return getYear(date) * 100 + getMonth(date) + 1;
};

export const getWeekNumber = (date: Date): number => {
  return getYear(date) * 100 + getWeek(date);
};

export const getKoreanWeekday = (date: string): string => {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dateObj = new Date(date);
  return weekdays[dateObj.getDay()];
};

/**
 * 주어진 시작일과 종료일 사이에서 특정 요일(Weekday)에 해당하는 모든 날짜를 반환
 * @param start - 시작 날짜 (Date)
 * @param end - 종료 날짜 (Date)
 * @param weekday - 0(일)~6(토) JS 표준 요일
 * @returns Date[]
 */
export function getDatesForWeekdayBetween(
  start: Date,
  end: Date,
  weekday: number,
): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  // 첫 해당 요일까지 이동
  current.setDate(current.getDate() + ((7 + weekday - current.getDay()) % 7));
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

export function getDateString(date?: string): string {
  const targetDate = date ? new Date(date) : new Date();
  return targetDate.toISOString().split('T')[0];
}
