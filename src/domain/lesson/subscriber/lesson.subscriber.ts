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
      .where('group.lessonId = :lessonId', { lessonId: lesson.id })
      //.andWhere('group.status = :status', { status: ClassStatus.ACTIVE })
      .getMany();

    const offdays: string[] = await this.calendarService.findByDateRange(
      lesson.schoolId,
      lesson.start,
      lesson.end,
    );

    for (const group of groups) {
      // 이 반의 기존 schooldays 모두 제거
      await event.manager
        .getRepository('Schoolday')
        .delete({ groupId: group.id });
      // 이 반의 schooldays 생성
      const schooldays: Schoolday[] = generateSchooldays(
        lesson,
        group,
        offdays,
      );
      group.schooldays = schooldays; // cascade로 자동 저장
      group.days = schooldays.length;
      await event.manager.getRepository(Group).save(group); // cascade로 schooldays도 저장/삭제됨
    }
  }
}
