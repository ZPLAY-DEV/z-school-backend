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
  const timeZone = 'Asia/Seoul';
  const calendarDays: ICalendarDay[] = [];

  if (lesson.start && lesson.end) {
    // 1. 시작일 종료일 사이에 반이 있는 요일의 모든 날짜 추출
    const startDate = new Date(`${lesson.start}T00:00:00+09:00`);
    const endDate = new Date(`${lesson.end}T23:59:59+09:00`);
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
        toZonedTime(startTime, timeZone),
        'yyyy-MM-dd HH:mm',
      );
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);
      const end = format(toZonedTime(endTime, timeZone), 'yyyy-MM-dd HH:mm');
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
  return calendarDays
    .filter((day) => day.isClassDay)
    .map((day) => {
      const [startDateStr, startTimeStr] = day.start.split(' ');
      const [endDateStr, endTimeStr] = day.end.split(' ');
      const startsAt = new Date(`${startDateStr}T${startTimeStr}:00+09:00`);
      const endsAt = new Date(`${endDateStr}T${endTimeStr}:00+09:00`);
      const duration = differenceInMinutes(endsAt, startsAt);
      return {
        schoolId: lesson.schoolId,
        termId: lesson.termId,
        lessonId: lesson.id,
        groupId: group.id,
        name: lesson.lessonName,
        duration: duration,
        startsAt: startsAt,
        endsAt: endsAt,
        note: null,
      } as Schoolday;
    });
}
