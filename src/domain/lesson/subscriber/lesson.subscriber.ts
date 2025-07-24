import { Injectable, Logger } from '@nestjs/common';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { DataSource, EntitySubscriberInterface, UpdateEvent } from 'typeorm';

@Injectable()
export class LessonSubscriber implements EntitySubscriberInterface<Lesson> {
  private readonly logger = new Logger(LessonSubscriber.name);

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo(): any {
    return Lesson;
  }

  afterUpdate(event: UpdateEvent<Lesson>) {
    const lesson = event.entity as Lesson;
    const prev = event.databaseEntity;

    // 기본적인 로깅만 수행합니다.
    // schooldays 처리는 LessonCoreService에서 이미 처리되므로 여기서는 제거합니다.
    const startChanged = lesson?.start !== prev?.start;
    const endChanged = lesson?.end !== prev?.end;

    if (startChanged || endChanged) {
      this.logger.log(
        `📅 [SUBSCRIBER] Lesson ${lesson.id} dates updated: start=${startChanged}, end=${endChanged}`,
      );
      this.logger.log(
        `ℹ️ [SUBSCRIBER] Schooldays processing is handled by LessonCoreService`,
      );
    }
  }
}
