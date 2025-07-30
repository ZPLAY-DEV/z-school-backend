import { PickRule } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import {
  compressRangeFormat,
  getBitmasks,
  getSortedWeekdays,
} from 'src/helpers/parse';

export function makeOfferingsFromLessons(
  termId: number,
  defaultRule: PickRule,
  schoolId: number,
  lessons: Lesson[],
): Offering[] {
  const offerings: Offering[] = [];

  for (const lesson of lessons) {
    for (const group of lesson.groups) {
      const timeRange: ITimeRange = {
        weekday: group.weekday,
        start: group.start,
        end: group.end,
      };

      // 기존 offering 중에서 frequency 제한을 만족하는 것 찾기
      const availableOffering = offerings.find(
        (o) =>
          o.lessonName === (lesson.lessonName || `과목 #${lesson.id}`) &&
          o.allowedGrades.join(',') === group.allowedGrades &&
          o.times.length < lesson.frequency,
      );

      if (availableOffering) {
        availableOffering.times.push(timeRange);
        availableOffering.groupIds.push(group.id);
        continue;
      }

      const pickRule: PickRule =
        group.capacity === 0 ? PickRule.ANYONE : defaultRule;

      const offering = new Offering({
        termId,
        schoolId,
        schoolName: lesson.schoolName || `학교 #${lesson.schoolId}`,
        lessonId: lesson.id,
        lessonName: lesson.lessonName || `과목 #${lesson.id}`,
        groupName: group.groupName || `반 #${group.id}`,
        samName: group.samName || `강사 미정`,
        capacity: group.capacity,
        allowedGrades: group.allowedGrades.split(',').map(Number),
        pickRule,
        times: [timeRange],
        bitmasks: [],
        groupIds: [group.id],
        prepickedStudentIds: [],
      });

      offerings.push(offering);
    }
  }

  // bitmasks, groupIds, groupName 후처리
  for (const offering of offerings) {
    const bitmasks: number[] = [];
    for (const time of offering.times) {
      const slots = getBitmasks(time);
      bitmasks.push(...slots);
    }
    offering.bitmasks = Array.from(new Set(bitmasks)).sort((a, b) => a - b);
    offering.groupIds = Array.from(new Set(offering.groupIds));
  }
  for (const offering of offerings) {
    const groupName = offering.groupName.split(' ')[0];
    const weekdayz = getSortedWeekdays(
      [...offering.times].map((v) => v.weekday),
    );
    const gradez = compressRangeFormat(offering.allowedGrades.join(','));
    offering.groupName = `${groupName} ${weekdayz}요일반 (${gradez}학년)`;
  }

  return offerings;
}
