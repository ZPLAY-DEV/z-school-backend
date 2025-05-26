import { differenceInMinutes } from 'date-fns';
import { ICalendarDay } from 'src/common/interfaces';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { calculateLessonDays } from './lesson-days.util';

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
    .filter((day) => day.classOn)
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
        name: '수업',
        duration: duration,
        startsAt: startsAt,
        endsAt: endsAt,
        note: null,
      } as Schoolday;
    });
}
