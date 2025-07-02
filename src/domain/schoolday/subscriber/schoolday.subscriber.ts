import { Injectable, Logger } from '@nestjs/common';
import { AttendanceStatus } from 'src/common/enums/attendance-status';
import {
  DeleteRequest,
  WriteRequest,
} from 'src/domain/attendance/types/attendance.types';
import {
  buildAttendanceItem,
  calculateTtl,
  generateDailyStudentKey,
  generateGroupKey,
} from 'src/domain/attendance/utils/attendance.utils';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
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
  //? 1. DynamoDB throttling 대응
  //? 2. Subscriber 중복 실행 방지.
  //? 3. DynamoDB batch 실행 후 실패 시 개별 처리
  //? ---------------------------------------------------------------------- ?//

  async afterUpdate(event: UpdateEvent<Schoolday>) {
    const schoolday = event.entity as Schoolday;
    const prev = event.databaseEntity;

    // 1. startsAt 또는 endsAt 이 변경되었는지 확인
    const startChanged = schoolday?.startsAt !== prev?.startsAt;
    const endChanged = schoolday?.endsAt !== prev?.endsAt;
    if (!(startChanged || endChanged)) return;

    try {
      // 2. 관련된 그룹과 학생 정보 조회
      const schooldayWithRelations = await event.manager
        .getRepository(Schoolday)
        .findOne({
          where: { id: schoolday.id },
          relations: {
            group: {
              picks: {
                student: true,
              },
              lesson: true,
            },
          },
        });

      if (!schooldayWithRelations?.group) {
        this.logger.warn(`No group found for schoolday ID: ${schoolday.id}`);
        return;
      }

      const { group } = schooldayWithRelations;
      const { picks, lesson } = group;

      if (!picks || picks.length === 0) {
        this.logger.warn(`No students found for schoolday ID: ${schoolday.id}`);
        return;
      }

      // 3. 이전 날짜와 새 날짜 계산
      const prevLocalDateStr = formatDateInKST(prev.startsAt);
      const newLocalDateStr = formatDateInKST(schoolday.startsAt);

      // 날짜가 실제로 변경되지 않았다면 처리하지 않음
      if (prevLocalDateStr === newLocalDateStr) {
        this.logger.debug(`Date unchanged for schoolday ID: ${schoolday.id}`);
        return;
      }

      const groupKey = generateGroupKey(group.id);

      // 4. 배치 작업을 위한 데이터 준비
      const batchRequests: (WriteRequest | DeleteRequest)[] = [];

      // 4a. 기존 출석 기록 삭제를 위한 delete requests 생성
      const dailyStudentKeysToDelete = picks.map(({ student }) => {
        return generateDailyStudentKey(
          prevLocalDateStr,
          student.id,
          student.grade,
          student.class,
          student.studentCode,
        );
      });

      const deleteRequests =
        this.schooldayAttendanceService.createDeleteRequestBatch(
          groupKey,
          dailyStudentKeysToDelete,
        );
      batchRequests.push(...deleteRequests);

      // 4b. 새로운 출석 기록 생성을 위한 put requests 생성
      const expires = calculateTtl(schoolday.startsAt);

      const putRequests: WriteRequest[] = picks.map((pick) => {
        const newDailyStudentKey = generateDailyStudentKey(
          newLocalDateStr,
          pick.student.id,
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );

        return {
          PutRequest: {
            Item: buildAttendanceItem({
              groupKey,
              dailyStudentKey: newDailyStudentKey,
              lessonId: schoolday.lessonId,
              lessonName: lesson?.lessonName,
              groupId: group.id,
              groupName: group.groupName,
              studentId: pick.student.id,
              studentName: pick.student.name,
              start: group.start,
              end: group.end,
              duration: schoolday.duration,
              status: AttendanceStatus.INIT,
              expires,
            }),
          },
        };
      });

      batchRequests.push(...putRequests);

      // 5. 배치 처리 실행
      if (batchRequests.length > 0) {
        const result =
          await this.schooldayAttendanceService.executeBatchOperations(
            batchRequests,
          );

        this.logger.log(
          `Successfully processed attendance records for schoolday ID: ${schoolday.id}. ` +
            `Total: ${result.total}, Failed batches: ${result.failedBatches}`,
        );

        // 실패한 배치가 있다면 경고 로그 출력
        if (result.failedBatches > 0) {
          this.logger.warn(
            `Some batches failed for schoolday ID: ${schoolday.id}. Failed: ${result.failedBatches}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error updating attendance records for schoolday ID: ${schoolday.id}`,
        error,
      );
      // 중요한 에러의 경우 추가 알림 로직을 여기에 추가할 수 있음
    }
  }
}
