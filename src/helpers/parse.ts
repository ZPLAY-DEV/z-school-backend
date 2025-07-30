import { Weekday, WeekdayOrder } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';

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

  // 쉼표로 구분된 숫자 문자열 처리. 마지막 , 는 무시
  if (input.includes(',')) {
    return input.split(',').map((v) => parseInt(v.trim(), 10));
  }

  return [1, 2, 3, 4, 5, 6]; // you can do better than this.
}

export function compressRangeFormat(input: string): string {
  const numbers = input
    .split(',')
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);

  if (numbers.length === 0) return '';
  if (numbers.length === 1) return numbers[0].toString();

  const isConsecutive = numbers.every((num, index, arr) => {
    if (index === 0) return true;
    return num === arr[index - 1] + 1;
  });

  if (isConsecutive) {
    return `${numbers[0]}~${numbers[numbers.length - 1]}`;
  } else {
    return input; // 연속되지 않은 경우는 원본 문자열 반환
  }
}

const SLOT_MINUTES = 5;
const SLOTS_PER_DAY = (12 * 60) / SLOT_MINUTES; // 144
// const TOTAL_SLOTS = SLOTS_PER_DAY * 6; // 월~토

// 시간을 24시간 형식으로 변환하는 함수
export const parseTime = (time: string): [number, number] => {
  const isPM = /pm$/i.test(time);
  const isAM = /am$/i.test(time);

  const timeValues = time
    .replace(/(am|pm)/i, '')
    .split(':')
    .map(Number);

  let hour = timeValues[0];
  const minute = timeValues[1];

  if (/am|pm/i.test(time)) {
    // 12시간제 표기
    if (hour === 12) {
      hour = isAM ? 0 : 12;
    } else if (isPM) {
      hour += 12;
    }
  }
  // 24시간제 표기는 그대로 반환
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
  const weekdayOrder = WeekdayOrder[weekday];
  if (weekdayOrder < 1 || weekdayOrder > 6) {
    throw new Error(`요일은 월요일부터 토요일까지만 유효합니다: ${weekday}`);
  }

  const bitmaskDayIndex = weekdayOrder - 1; // 월: 0, 화: 1, ..., 토: 5
  return bitmaskDayIndex * SLOTS_PER_DAY + slotInDay;
};

export function getSortedWeekdays(days: string[]): string {
  const weekdayOrder = ['일', '월', '화', '수', '목', '금', '토'];

  const sorted = [...new Set(days)] // 중복 제거
    .filter((day) => weekdayOrder.includes(day)) // 유효한 요일만
    .sort((a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b));

  if (sorted.length === 0) return ``;
  if (sorted.length === 1) return sorted[0];

  return sorted.join('·');
}

/**
 * 두 시간 범위가 충돌하는지 확인하는 함수
 * @param oneWeekday 첫 번째 시간의 요일
 * @param oneStart 첫 번째 시간의 시작 시간 (HH:MM)
 * @param oneEnd 첫 번째 시간의 종료 시간 (HH:MM)
 * @param twoWeekday 두 번째 시간의 요일
 * @param twoStart 두 번째 시간의 시작 시간 (HH:MM)
 * @param twoEnd 두 번째 시간의 종료 시간 (HH:MM)
 * @returns 충돌하면 true, 충돌하지 않으면 false
 */
export function isTimeConflict(
  oneWeekday: Weekday,
  oneStart: string,
  oneEnd: string,
  twoWeekday: Weekday,
  twoStart: string,
  twoEnd: string,
): boolean {
  // 요일이 다르면 충돌하지 않음
  if (oneWeekday !== twoWeekday) {
    return false;
  }

  // 시간을 분 단위로 변환
  const [oneStartHour, oneStartMinute] = parseTime(oneStart);
  const [oneEndHour, oneEndMinute] = parseTime(oneEnd);
  const [twoStartHour, twoStartMinute] = parseTime(twoStart);
  const [twoEndHour, twoEndMinute] = parseTime(twoEnd);

  const oneStartMinutes = oneStartHour * 60 + oneStartMinute;
  const oneEndMinutes = oneEndHour * 60 + oneEndMinute;
  const twoStartMinutes = twoStartHour * 60 + twoStartMinute;
  const twoEndMinutes = twoEndHour * 60 + twoEndMinute;

  // 시간 충돌 검증
  // 두 시간 범위가 겹치는 경우: (oneStart < twoEnd) && (twoStart < oneEnd)
  return oneStartMinutes < twoEndMinutes && twoStartMinutes < oneEndMinutes;
}
