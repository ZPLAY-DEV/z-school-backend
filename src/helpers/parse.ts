export function parseRangeFormat(input?: string): number[] {
  if (!input) {
    return [1, 2, 3, 4, 5, 6];
  }

  // 단일 숫자 처리: 숫자만 있는 경우
  const singleNumberMatch = input.match(/^(\d+)$/);
  if (singleNumberMatch) {
    return [parseInt(singleNumberMatch[1], 10)];
  }

  // 범위 문자열 처리 (예: "1-6" 또는 "1~4")
  const rangeMatch = input.match(/^(\d+)\s*[-~]\s*(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);

    if (start > end) {
      return [];
    }

    const result: number[] = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }

    return result;
  }

  return [1, 2, 3, 4, 5, 6]; // you can do better than this.
}

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
export const parseTime = (time: string): [number, number] => {
  const isPM = /pm$/i.test(time);
  const isAM = /am$/i.test(time) || !/am|pm/i.test(time); // am/pm 없으면 am으로

  const timeValues = time
    .replace(/(am|pm)/i, '')
    .split(':')
    .map(Number);

  let hour = timeValues[0];
  const minute = timeValues[1];

  if (hour === 12) {
    hour = isAM ? 0 : 12;
  } else if (isPM) {
    hour += 12;
  }

  return [hour, minute];
};

// [시간, 분] 배열을 "HH:MM" 형식 문자열로 변환하는 함수
export const parseTimeFormat = (timeArray: [number, number]): string => {
  const [hour, minute] = timeArray;

  // 0 패딩을 적용하여 2자리 문자열로 변환
  const paddedHour = hour.toString().padStart(2, '0');
  const paddedMinute = minute.toString().padStart(2, '0');

  return `${paddedHour}:${paddedMinute}`;
};

export const getBitmasks = ({ weekday, start, end }: ITimeRange): number[] => {
  const startIndex = _timeToSlotIndex(weekday, start);
  const endIndex = _timeToSlotIndex(weekday, end) - 1; // 끝나는 시간 포함하지 않는다고 가정

  const slots: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    slots.push(i);
  }

  return slots;
};

const _timeToSlotIndex = (weekday: Weekday, time: string): number => {
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
