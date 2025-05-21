import { Injectable, Logger } from '@nestjs/common';
import { ClassStatus } from 'src/common/enums';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
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

    for (const group of groups) {
      const calendarRepository = event.manager.getRepository(Calendar);
      const { calendarDays, days } = await calculateLessonDays(
        lesson,
        group,
        calendarRepository,
      );
      group.days = days;
      group.calendarDays = calendarDays;
      await event.manager.getRepository(Group).save(group);
    }
  }
}
