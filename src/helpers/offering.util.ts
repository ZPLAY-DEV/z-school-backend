import { Logger } from '@nestjs/common';
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
  const logger = new Logger('makeOfferingsFromLessons');
  logger.debug(
    `[makeOfferingsFromLessons] 시작 - termId: ${termId}, defaultRule: ${defaultRule}, schoolId: ${schoolId}, lessons.length: ${lessons.length}`,
  );

  const offerings: Offering[] = [];

  for (const lesson of lessons) {
    logger.debug(
      `[makeOfferingsFromLessons] lesson 처리 중 - lessonId: ${lesson.id}, lessonName: ${lesson.lessonName}, frequency: ${lesson.frequency}, groups.length: ${lesson.groups?.length || 0}`,
    );

    for (const group of lesson.groups) {
      const timeRange: ITimeRange = {
        weekday: group.weekday,
        start: group.start,
        end: group.end,
      };

      logger.debug(
        `[makeOfferingsFromLessons] group 처리 중 - groupId: ${group.id}, groupName: ${group.groupName}, capacity: ${group.capacity}, allowedGrades: ${group.allowedGrades}`,
      );

      // 기존 offering 중에서 frequency 제한을 만족하는 것 찾기
      const availableOffering = offerings.find(
        (o) =>
          o.lessonName === (lesson.lessonName || `과목 #${lesson.id}`) &&
          o.allowedGrades.join(',') === group.allowedGrades &&
          o.times.length < lesson.frequency,
      );

      if (availableOffering) {
        logger.debug(
          `[makeOfferingsFromLessons] 기존 offering에 추가 - offeringId: ${availableOffering.id}, lessonName: ${availableOffering.lessonName}, 현재 times.length: ${availableOffering.times.length}, frequency: ${lesson.frequency}`,
        );
        availableOffering.times.push(timeRange);
        availableOffering.groupIds.push(group.id);
        continue;
      }

      const pickRule: PickRule =
        group.capacity === 0 ? PickRule.ANYONE : defaultRule;

      logger.debug(
        `[makeOfferingsFromLessons] 새로운 offering 생성 - group.capacity: ${group.capacity}, defaultRule: ${defaultRule}, 최종 pickRule: ${pickRule}`,
      );

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

      logger.debug(
        `[makeOfferingsFromLessons] offering 생성 완료 - lessonId: ${offering.lessonId}, lessonName: ${offering.lessonName}, groupName: ${offering.groupName}, capacity: ${offering.capacity}, pickRule: ${offering.pickRule}`,
      );
      offerings.push(offering);
    }
  }

  // bitmasks, groupIds, groupName 후처리
  logger.debug(
    `[makeOfferingsFromLessons] 후처리 시작 - offerings.length: ${offerings.length}`,
  );

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

  logger.debug(
    `[makeOfferingsFromLessons] 완료 - 최종 offerings.length: ${offerings.length}`,
  );
  logger.debug(
    `[makeOfferingsFromLessons] 최종 pickRule 분포:`,
    offerings.reduce(
      (acc, offering) => {
        acc[offering.pickRule] = (acc[offering.pickRule] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  );

  return offerings;
}
