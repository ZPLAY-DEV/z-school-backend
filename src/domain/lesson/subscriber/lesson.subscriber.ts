import { Injectable, Logger } from '@nestjs/common';
import { CalendarService } from 'src/domain/calendar/calendar.service';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { generateSchooldays } from 'src/helpers/lesson-days.util';
import { DataSource, EntitySubscriberInterface, UpdateEvent } from 'typeorm';

@Injectable()
export class LessonSubscriber implements EntitySubscriberInterface<Lesson> {
  private readonly logger = new Logger(LessonSubscriber.name);

  constructor(
    dataSource: DataSource,
    private readonly calendarService: CalendarService,
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

    // status 와 상관없이 모든 강좌의 수업일 계산이 다시 일어나도록 수정.
    // if (lesson.status !== ClassStatus.ACTIVE) return;
    const groups = await event.manager
      .getRepository(Group)
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .where('group.lessonId = :lessonId', { lessonId: lesson.id })
      //.andWhere('group.status = :status', { status: ClassStatus.ACTIVE })
      .getMany();

    const offdays: string[] = await this.calendarService.findByDateRange(
      lesson.schoolId,
      lesson.start,
      lesson.end,
    );

    for (const group of groups) {
      // 1. 기존 schooldays를 key-value로 변환 (startsAt+endsAt 기준)
      const existingMap = new Map<string, Schoolday>();
      for (const sd of group.schooldays) {
        const key = `${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
        existingMap.set(key, sd);
      }

      // 2. 새로 생성될 schooldays
      const newSchooldays: Schoolday[] = generateSchooldays(
        lesson,
        group,
        offdays,
      );
      const newMap = new Map<string, Schoolday>();
      for (const sd of newSchooldays) {
        const key = `${sd.startsAt.toISOString()}|${sd.endsAt.toISOString()}`;
        newMap.set(key, sd);
      }

      // 3. 추가해야 할 schooldays (new에만 있는 것)
      const toInsert = Array.from(newMap.entries())
        .filter(([key]) => !existingMap.has(key))
        .map(([, sd]) => sd);

      // 4. 삭제해야 할 schooldays (existing에만 있는 것)
      const toDelete = Array.from(existingMap.entries())
        .filter(([key]) => !newMap.has(key))
        .map(([, sd]) => sd);

      // 5. 실제 DB 반영 (update는 불필요하므로 생략)
      if (toDelete.length > 0) {
        await event.manager
          .getRepository('Schoolday')
          .delete(toDelete.map((sd) => sd.id));
      }
      if (toInsert.length > 0) {
        await event.manager.getRepository('Schoolday').save(toInsert);
      }

      // 6. group.days 갱신
      group.days = newSchooldays.length;
      await event.manager.getRepository(Group).save(group);
    }
  }
}
