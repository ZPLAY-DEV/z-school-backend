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
