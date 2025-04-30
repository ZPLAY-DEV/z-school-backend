import { getMonth, getWeek, getYear, isAfter, isValid, parse } from 'date-fns';
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

/**
 * ISO 형식의 날짜 문자열 범위 검증
 * @param start - 시작 날짜
 * @param end - 종료 날짜
 * @returns 유효한 날짜 범위인 경우 true, 그렇지 않은 경우 false
 * */
export const validateDateRange = (start: string, end: string): boolean => {
  // 날짜 형식 검증을 위한 정규표현식 (YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(start) || !dateFormatRegex.test(end)) {
    return false;
  }

  // date-fns를 사용해 문자열을 Date 객체로 파싱
  const startDate = parse(start, 'yyyy-MM-dd', new Date());
  const endDate = parse(end, 'yyyy-MM-dd', new Date());

  // 유효한 날짜인지 체크
  if (!isValid(startDate) || !isValid(endDate)) {
    return false;
  }

  // start가 end보다 큰지 체크
  if (isAfter(startDate, endDate)) {
    return false;
  }

  return true;
};
