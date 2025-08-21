import { differenceInMinutes } from 'date-fns';
import { format, toZonedTime } from 'date-fns-tz';
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

    for (const date of dates) {
      const startTime = new Date(date);
      startTime.setHours(startHour, startMinute, 0, 0);
      const start = format(
        toZonedTime(startTime, 'Asia/Seoul'),
        'yyyy-MM-dd HH:mm',
      );
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);
      const end = format(
        toZonedTime(endTime, 'Asia/Seoul'),
        'yyyy-MM-dd HH:mm',
      );
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

  const schooldays = calendarDays
    .filter((day) => day.isClassDay)
    .map((day) => {
      const [startDateStr, startTimeStr] = day.start.split(' ');
      const [endDateStr, endTimeStr] = day.end.split(' ');
      const today = startDateStr;

      // local 시간을 UTC로 변환
      const startsAt = new Date(`${startDateStr}T${startTimeStr}:00+09:00`);
      const endsAt = new Date(`${endDateStr}T${endTimeStr}:00+09:00`);
      const startsAtInUtc = toZonedTime(startsAt, 'UTC');
      const endsAtInUtc = toZonedTime(endsAt, 'UTC');

      const duration = differenceInMinutes(endsAt, startsAt);
      const schoolday = {
        schoolId: lesson.schoolId,
        termId: lesson.termId,
        lessonId: lesson.id,
        groupId: group.id,
        name: lesson.lessonName,
        duration: duration,
        today: today,
        weekday: group.weekday,
        weekNumber: weekNumber++,
        startsAt: startsAtInUtc,
        endsAt: endsAtInUtc,
        note: null,
      } as unknown as Schoolday;

      return schoolday;
    });

  console.log(
    `🔍 [DEBUG] generateSchooldays returning ${schooldays.length} schooldays`,
  );
  return schooldays;
}
