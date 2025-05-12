export enum Weekday {
  SUNDAY = '일',
  MONDAY = '월',
  TUESDAY = '화',
  WEDNESDAY = '수',
  THURSDAY = '목',
  FRIDAY = '금',
  SATURDAY = '토',
}

export const WeekdayOrder: Record<Weekday, number> = {
  [Weekday.SUNDAY]: 0,
  [Weekday.MONDAY]: 1,
  [Weekday.TUESDAY]: 2,
  [Weekday.WEDNESDAY]: 3,
  [Weekday.THURSDAY]: 4,
  [Weekday.FRIDAY]: 5,
  [Weekday.SATURDAY]: 6,
};
