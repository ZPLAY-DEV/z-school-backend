import { Injectable, Logger } from '@nestjs/common';
import { ClassStatus } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { calculateLessonDays } from 'src/helpers/lesson-days.util';
import { DataSource, EntitySubscriberInterface, UpdateEvent } from 'typeorm';

@Injectable()
export class LessonSubscriber implements EntitySubscriberInterface<Lesson> {
  private readonly logger = new Logger(LessonSubscriber.name);

  constructor(
    dataSource: DataSource,
    // private readonly calendarService: CalendarService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo(): any {
    return Lesson;
  }

  async afterUpdate(event: UpdateEvent<Lesson>) {
    const lesson = event.entity as Lesson;
    const prev = event.databaseEntity;

    // 1. start 또는 end 가 변경되었고
    const startChanged = lesson?.start !== prev?.start;
    const endChanged = lesson?.end !== prev?.end;
    if (!(startChanged || endChanged)) return;

    // 2. status 가 ACTIVE 상태라면
    if (lesson.status !== ClassStatus.ACTIVE) return;

    // 3. 연관된 groups 중 ACTIVE 만 필터링
    const groups = await event.manager
      .getRepository(Group)
      .createQueryBuilder('group')
      .where('group.lessonId = :lessonId', { lessonId: lesson.id })
      .andWhere('group.status = :status', { status: ClassStatus.ACTIVE })
      .getMany();

    const schooldayRepository = event.manager.getRepository(Schoolday);

    for (const group of groups) {
      const calendarDays = calculateLessonDays(lesson, group);
      // 기존 schooldays 삭제
      await schooldayRepository.delete({ groupId: group.id });
      // 새 schooldays 생성
      const schooldays: Schoolday[] = calendarDays
        .filter((day) => day.classOn)
        .map((day) => {
          const [startDateStr, startTimeStr] = day.start.split(' ');
          const [endDateStr, endTimeStr] = day.end.split(' ');
          return schooldayRepository.create({
            schoolId: lesson.schoolId,
            termId: lesson.termId,
            lessonId: lesson.id,
            groupId: group.id,
            name: null,
            startStr: day.start,
            endStr: day.end,
            duration: 0,
            startsAt: new Date(`${startDateStr}T${startTimeStr}:00+09:00`),
            endsAt: new Date(`${endDateStr}T${endTimeStr}:00+09:00`),
            note: null,
          });
        });
      if (schooldays.length > 0) {
        await schooldayRepository.save(schooldays);
      }
      group.days = schooldays.length;
      await event.manager.getRepository(Group).save(group);
    }
  }
}
