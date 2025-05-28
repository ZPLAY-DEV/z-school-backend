import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { AttendanceStatus } from 'src/common/enums/attendance-status';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { getDigitStudentId, getStudentId } from 'src/helpers/student';
import { DataSource, EntitySubscriberInterface, UpdateEvent } from 'typeorm';

@Injectable()
export class SchooldaySubscriber
  implements EntitySubscriberInterface<Schoolday>
{
  private readonly logger = new Logger(SchooldaySubscriber.name);

  constructor(
    dataSource: DataSource,
    private readonly attendanceService: AttendanceService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo(): any {
    return Schoolday;
  }

  async afterUpdate(event: UpdateEvent<Schoolday>) {
    const schoolday = event.entity as Schoolday;
    const prev = event.databaseEntity;

    // 1. startsAt 또는 endsAt이 변경되었는지 확인
    const startChanged = schoolday?.startsAt !== prev?.startsAt;
    const endChanged = schoolday?.endsAt !== prev?.endsAt;
    if (!(startChanged || endChanged)) return;

    this.logger.log(`Schoolday time changed for ID: ${schoolday.id}`);

    try {
      // 2. 관련된 그룹과 학생 정보 조회
      const schooldayWithRelations = await event.manager
        .getRepository(Schoolday)
        .findOne({
          where: { id: schoolday.id },
          relations: {
            group: {
              groupStudents: {
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
      const { groupStudents, lesson } = group;

      // 3. 이전 날짜와 새 날짜 계산
      const prevLocalDate = format(
        toZonedTime(prev.startsAt, 'Asia/Seoul'),
        'yyyy-MM-dd',
      );
      const newLocalDate = format(
        toZonedTime(schoolday.startsAt, 'Asia/Seoul'),
        'yyyy-MM-dd',
      );

      const groupKey = `GROUP#${group.id}`;

      // 4. 기존 출석 기록 삭제 (날짜가 변경된 경우 또는 시간이 변경된 경우)
      if (groupStudents && groupStudents.length > 0) {
        for (const { student } of groupStudents) {
          const digitStudentId = getDigitStudentId(
            student.grade,
            student.class,
            student.studentCode,
          );
          const prevDailyStudentKey = `DATE#${prevLocalDate}#STUDENT#${digitStudentId}`;

          try {
            // 기존 출석 기록 삭제
            await this.attendanceService.delete({
              groupKey,
              dailyStudentKey: prevDailyStudentKey,
            });
            this.logger.log(
              `Deleted attendance record: ${groupKey}/${prevDailyStudentKey}`,
            );
          } catch (error) {
            // 기록이 없을 수도 있으므로 에러는 로그만 남김
            this.logger.warn(
              `Failed to delete attendance record: ${groupKey}/${prevDailyStudentKey}`,
              error,
            );
          }
        }
      }

      // 5. 새로운 출석 기록 생성
      if (groupStudents && groupStudents.length > 0) {
        const expires =
          Math.floor(new Date(schoolday.startsAt).getTime() / 1000) +
          60 * 60 * 24 * 365; // 1년 후 만료

        for (const { student } of groupStudents) {
          const digitStudentId = getDigitStudentId(
            student.grade,
            student.class,
            student.studentCode,
          );
          const studentId = getStudentId(
            student.grade,
            student.class,
            student.studentCode,
          );
          const newDailyStudentKey = `DATE#${newLocalDate}#STUDENT#${digitStudentId}`;

          try {
            await this.attendanceService.create({
              groupKey,
              dailyStudentKey: newDailyStudentKey,
              lessonId: schoolday.lessonId,
              lessonName: lesson?.lessonName ?? '과목',
              groupId: group.id,
              groupName: group.groupName ?? '반',
              studentId,
              studentName: student.name ?? '학생',
              start: group.start,
              end: group.end,
              duration: schoolday.duration,
              status: AttendanceStatus.PENDING,
              expires,
            });
            this.logger.log(
              `Created new attendance record: ${groupKey}/${newDailyStudentKey}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to create attendance record: ${groupKey}/${newDailyStudentKey}`,
              error,
            );
          }
        }
      }

      this.logger.log(
        `Successfully updated attendance records for schoolday ID: ${schoolday.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating attendance records for schoolday ID: ${schoolday.id}`,
        error,
      );
    }
  }
}
