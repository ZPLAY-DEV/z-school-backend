import { Weekday } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';

const SLOT_MINUTES = 5;
const SLOTS_PER_DAY = (12 * 60) / SLOT_MINUTES; // 144
// const TOTAL_SLOTS = SLOTS_PER_DAY * 6; // 월~토

const weekdayOrder: Record<Weekday, number> = {
  [Weekday.MONDAY]: 0,
  [Weekday.TUESDAY]: 1,
  [Weekday.WEDNESDAY]: 2,
  [Weekday.THURSDAY]: 3,
  [Weekday.FRIDAY]: 4,
  [Weekday.SATURDAY]: 5,
  [Weekday.SUNDAY]: 6,
};

// 시간을 24시간 형식으로 변환하는 함수
const parseTime = (time: string): [number, number] => {
  const isPM = /pm$/i.test(time);
  const isAM = /am$/i.test(time);
  const timeValues = time
    .replace(/(am|pm)/i, '')
    .split(':')
    .map(Number);
  let hour = timeValues[0];
  const minute = timeValues[1];

  // 12시인 경우, AM이면 00시, PM이면 12시로 변환
  if (hour === 12) {
    hour = isAM ? 0 : 12;
  } else if (isPM) {
    hour += 12;
  }

  return [hour, minute];
};

const timeToSlotIndex = (weekday: Weekday, time: string): number => {
  const [hour, minute] = parseTime(time);
  const minutesSince8am = (hour - 8) * 60 + minute;

  if (minutesSince8am < 0 || minutesSince8am >= 12 * 60) {
    throw new Error(`시간은 08:00 ~ 20:00 사이여야 합니다: ${time}`);
  }

  const slotInDay = Math.floor(minutesSince8am / SLOT_MINUTES);
  const weekdayIndex = weekdayOrder[weekday];
  if (weekdayIndex === undefined) {
    throw new Error(`지원하지 않는 요일입니다: ${weekday}`);
  }
  return weekdayIndex * SLOTS_PER_DAY + slotInDay;
};

export function getBitmasks({ weekday, start, end }: ITimeRange): number[] {
  const startIndex = timeToSlotIndex(weekday, start);
  const endIndex = timeToSlotIndex(weekday, end) - 1; // 끝나는 시간 포함하지 않는다고 가정

  const slots: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    slots.push(i);
  }

  return slots;
}
