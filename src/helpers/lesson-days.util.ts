import { differenceInMinutes } from 'date-fns';
import { format } from 'date-fns-tz';
import { WeekdayOrder } from 'src/common/enums';
import { ICalendarDay } from 'src/common/interfaces';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { getDatesForWeekdayBetween } from 'src/helpers/date';
import { parseTime } from 'src/helpers/parse';

export interface LessonDaysResult {
  calendarDays: any[];
  days: number;
}

export function calculateLessonDays(
  lesson: Lesson,
  group: Group,
  offdays: string[] = [],
): ICalendarDay[] {
  const calendarDays: ICalendarDay[] = [];

  // lesson.start와 lesson.end가 없으면 term.start와 term.end를 사용
  const startDateStr = lesson.start || lesson.term?.start;
  const endDateStr = lesson.end || lesson.term?.end;

  if (startDateStr && endDateStr) {
    // 1. 시작일 종료일 사이에 반이 있는 요일의 모든 날짜 추출
    const startDate = new Date(`${startDateStr}T00:00:00+09:00`);
    const endDate = new Date(`${endDateStr}T23:59:59+09:00`);

    const dates: Date[] = getDatesForWeekdayBetween(
      startDate,
      endDate,
      WeekdayOrder[group.weekday],
    );

    // 2. 반의 시간 정보 추출
    const [startHour, startMinute] = parseTime(group.start);
    const [endHour, endMinute] = parseTime(group.end);

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];

      // KST 시간 문자열 생성 (generateSchooldays에서 KST로 해석하기 위해)
      const dateStr = format(date, 'yyyy-MM-dd');
      const start = `${dateStr} ${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const end = `${dateStr} ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

      const isClassDay = offdays.includes(start.split(' ')[0]) ? false : true;

      calendarDays.push({ start, end, isClassDay });
    }
  }

  return calendarDays;
}

export function generateSchooldays(
  lesson: Lesson,
  group: Group,
  offdays: string[] = [],
): Schoolday[] {
  const calendarDays: ICalendarDay[] = calculateLessonDays(
    lesson,
    group,
    offdays,
  );

  // 연속적인 주차 번호를 위해 모든 calendarDays에 대해 순차적으로 처리
  let weekNumber = 1; // 첫 번째 주차부터 시작

  const filteredDays = calendarDays.filter((day) => day.isClassDay);

  const schooldays = filteredDays.map((day) => {
    const [startDateStr, startTimeStr] = day.start.split(' ');
    const [endDateStr, endTimeStr] = day.end.split(' ');
    const today = startDateStr;

    // KST 시간을 UTC로 변환
    const startsAtString = `${startDateStr} ${startTimeStr}:00`;
    const endsAtString = `${endDateStr} ${endTimeStr}:00`;

    // KST 시간을 명시적으로 UTC로 변환
    const startsAt = new Date(`${startsAtString}+09:00`);
    const endsAt = new Date(`${endsAtString}+09:00`);

    const duration = differenceInMinutes(endsAt, startsAt);

    const schoolday = {
      schoolId: lesson.schoolId,
      termId: lesson.termId,
      lessonId: lesson.id,
      groupId: group.id,
      name: lesson.lessonName,
      duration: duration,
      today: today,
      initial: today,
      weekday: group.weekday,
      weekNumber: weekNumber++,
      startsAt: startsAt,
      endsAt: endsAt,
      note: null,
    } as unknown as Schoolday;

    return schoolday;
  });

  return schooldays;
}
