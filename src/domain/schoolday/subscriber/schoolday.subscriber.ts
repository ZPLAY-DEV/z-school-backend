import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
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

  //? ---------------------------------------------------------------------- ?//
  //? 다이나모 출석부는 건들지 않는다.
  //? 지난 수업 변경 니즈가 없고, 미래의 수업이라면, 아직 `attendance` 를 생성하기 이전이다.
  //? 만일 미리 결석처리를 한 내용이 있다면 삭제하도록.
  //? ---------------------------------------------------------------------- ?//

  async afterUpdate(event: UpdateEvent<Schoolday>) {
    const schoolday = event.entity as Schoolday;
    const prev = event.databaseEntity;

    const startChanged = schoolday?.startsAt !== prev?.startsAt;
    const endChanged = schoolday?.endsAt !== prev?.endsAt;

    // 안바뀌었다면, 종료
    if (!(startChanged || endChanged)) return;

    // original을 먼저 설정 (이전 today 값 또는 이전 startsAt의 날짜)
    schoolday.original = prev?.today ?? formatDateInKST(prev.startsAt);

    // 새로운 today 값 계산
    const today = format(schoolday.startsAt, 'yyyy-MM-dd');
    schoolday.today = today;
    schoolday.weekday = getKoreanWeekday(today) as Weekday;

    this.logger.log(
      `Schoolday update - prev.today: ${prev?.today}, new today: ${today}, original: ${schoolday.original}`,
    );

    // save 대신 update를 사용하여 무한 루프 방지
    await event.manager.update(Schoolday, schoolday.id, {
      original: schoolday.original,
      today: schoolday.today,
      weekday: schoolday.weekday,
    });

    // 혹시 schoolday.original 에 있는 다이나모 출석부 (attendance)가 있다면 삭제
    await this.schooldayAttendanceService.deleteGroupAttendanceWithDate({
      schoolId: schoolday.schoolId,
      termId: schoolday.termId,
      groupId: schoolday.groupId,
      date: schoolday.original,
    });
  }
}
