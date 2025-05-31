import { differenceInMinutes, parse } from 'date-fns';

export function getDuration(start: string, end: string): number {
  const startDate = parse(start, 'HH:mm', new Date());
  const endDate = parse(end, 'HH:mm', new Date());
  return differenceInMinutes(endDate, startDate);
}
