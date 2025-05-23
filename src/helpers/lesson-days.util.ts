import { format, toZonedTime } from 'date-fns-tz';
import { WeekdayOrder } from 'src/common/enums';
import { ICalendarDay } from 'src/common/interfaces';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { getDatesForWeekdayBetween } from 'src/helpers/date';
import { parseTime } from 'src/helpers/parse';
import { Repository } from 'typeorm';

export interface LessonDaysResult {
  calendarDays: any[];
  days: number;
}

export async function calculateLessonDays(
  lesson: Lesson,
  group: Group,
  calendarRepository: Repository<Calendar>,
): Promise<LessonDaysResult> {
  const timeZone = 'Asia/Seoul';

  // 1. Calculate dates for the group's weekday between lesson.start and lesson.end
  const startDate = new Date(`${lesson.start}T00:00:00+09:00`);
  const endDate = new Date(`${lesson.end}T23:59:59+09:00`);
  const weekdayNum = WeekdayOrder[group.weekday];
  const dates = getDatesForWeekdayBetween(startDate, endDate, weekdayNum);

  // 2. Build calendarDays array
  const [startHour, startMinute] = parseTime(group.start);
  const [endHour, endMinute] = parseTime(group.end);
  const calendarDays: ICalendarDay[] = [];

  for (const date of dates) {
    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);
    const start = format(toZonedTime(startTime, timeZone), 'yyyy-MM-dd HH:mm');
    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);
    const end = format(toZonedTime(endTime, timeZone), 'yyyy-MM-dd HH:mm');
    calendarDays.push({ start, end, classOn: true });
  }

  // 3. Check for school calendar holidays and set isActive = false if found
  for (const calDay of calendarDays) {
    const [date] = calDay.start.split(' ');
    const calendar = await calendarRepository
      .createQueryBuilder('calendar')
      .where('calendar.schoolId = :schoolId', { schoolId: lesson.schoolId })
      .andWhere('calendar.date = :date', { date: date })
      .getOne();
    if (calendar) {
      calDay.classOn = false;
    }
  }

  // 4. Count active days
  const days = calendarDays.filter((calDay) => calDay.classOn).length;

  return { calendarDays, days };
}
