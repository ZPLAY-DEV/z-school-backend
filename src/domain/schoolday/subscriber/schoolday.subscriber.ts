import { Injectable, Logger } from '@nestjs/common';
import { format, isAfter } from 'date-fns';
import { Weekday } from 'src/common/enums';
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

  async afterUpdate(event: UpdateEvent<Schoolday>) {
    const schoolday = event.entity as Schoolday;
    const prev = event.databaseEntity;
    const startChanged =
      schoolday?.startsAt?.getTime() !== prev?.startsAt?.getTime();

    if (!startChanged) return;

    const original = prev?.today ?? formatDateInKST(prev.startsAt);
    const today = format(schoolday.startsAt, 'yyyy-MM-dd');

    if (original === today) return;

    const weekday = getKoreanWeekday(today) as Weekday;

    this.logger.log(
      `Schoolday update - prev.today: ${prev?.today}, new today: ${today}, original: ${original}`,
    );

    await event.manager.transaction(async (trx) => {
      // by using raw query update, no lifecycle hooks are triggered again.
      await trx.update(Schoolday, schoolday.id, {
        original,
        today,
        weekday,
      });

      //? 아직 수업 전이라면, 관련 다이나모 출석부에 그날 선통보 결석 내용이 있는 경우, 필요없어지므로 삭제.
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
