import { Injectable, Logger } from '@nestjs/common';
import { format, isAfter } from 'date-fns';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import { getKoreanWeekday } from 'src/helpers/date';
import { formatDateInKST } from 'src/helpers/time';
import { DataSource, EntitySubscriberInterface, UpdateEvent } from 'typeorm';

@Injectable()
export class SchooldaySubscriber
  implements EntitySubscriberInterface<Schoolday>
{
  private readonly logger = new Logger(SchooldaySubscriber.name);

  constructor(
    dataSource: DataSource,
    private readonly schooldayAttendanceService: SchooldayAttendanceService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo(): any {
    return Schoolday;
  }

  //? [목적1] schoolday 변경전 날짜 와 변경후 날짜에 따른 후작업이 필요할 수 있다.
  //? - 변경후 날짜가 아직 수업전이고, 다이나오 출석부에 변경전 날짜에 선통보결석내용이 있다면, 그것을 찾아 삭제할 것.
  async afterUpdate(event: UpdateEvent<Schoolday>) {
    const schoolday = event.entity as Schoolday;
    const prev = event.databaseEntity;
    const startChanged =
      schoolday?.startsAt?.getTime() !== prev?.startsAt?.getTime();

    if (!startChanged) return;

    const original = prev?.today ?? formatDateInKST(prev.startsAt);
    const today = format(schoolday.startsAt, 'yyyy-MM-dd');
    const weekday = getKoreanWeekday(today);

    this.logger.log(
      `Schoolday subscriber - prev.today: ${prev?.today}, new today: ${today}, original: ${original}`,
    );

    await event.manager.transaction(async (trx) => {
      // by using raw query update, no lifecycle hooks are triggered again.
      await trx.update(Schoolday, schoolday.id, {
        original,
        today,
        weekday,
      });

      const currentDate = formatDateInKST(new Date());
      const isBeforeClass =
        isAfter(original, currentDate) && isAfter(today, currentDate);

      if (isBeforeClass) {
        // Attendance cleanup
        await this.schooldayAttendanceService.deleteGroupAttendanceWithDate({
          schoolId: schoolday.schoolId,
          termId: schoolday.termId,
          groupId: schoolday.groupId,
          date: original,
        });
      }
    });
  }
}
