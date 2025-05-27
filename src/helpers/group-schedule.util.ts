import { ScheduleResponseDto } from 'src/domain/group/dto/schedule-response.dto';

import {
  DailyScheduleDto,
  ScheduleGroupDto,
} from 'src/domain/group/dto/schedule-response.dto';

/**
 * @see ScheduleResponseDto
 */
export const transformScheduleResponse = (
  dates: string[],
  originalResult: Record<string, any[]>,
): ScheduleResponseDto => {
  const schedules: DailyScheduleDto[] = [];

  Object.entries(originalResult).forEach(([dateWithWeekday, groups]) => {
    const match = dateWithWeekday.match(/^(\d{4}-\d{2}-\d{2})\((.)\)$/);
    if (!match) return;

    const [, date, weekday] = match;

    schedules.push({
      date,
      weekday,
      displayDate: dateWithWeekday,
      groups: groups as ScheduleGroupDto[],
    });
  });

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    schedules,
  };
};
