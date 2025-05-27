import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { AttendanceStatus } from 'src/common/enums/attendance-status';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import { CreateSchooldayAttendanceDto } from 'src/domain/schoolday/dto/create-schoolday-attendance.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
@Injectable()
export class SchooldayAttendanceService {
  private readonly logger = new Logger(SchooldayAttendanceService.name);

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    private readonly attendanceService: AttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSchooldayAttendanceDto): Promise<any> {
    const { schoolId, termId, from, to } = dto;
    const startsAt = new Date(from);
    const endsAt = new Date(to);
    console.log(`startsAt =`, startsAt);
    console.log(`endsAt =`, endsAt);
    const schooldays = await this.schooldayRepository.find({
      where: {
        schoolId,
        termId,
        startsAt: MoreThanOrEqual(startsAt),
        endsAt: LessThanOrEqual(endsAt),
      },
      relations: {
        group: {
          groupStudents: {
            student: true,
          },
          lesson: true,
        },
      },
    });

    await Promise.all(
      schooldays.map(async (schoolday) => {
        const { group, startsAt, duration, lessonId, groupId } = schoolday;
        const { groupStudents, groupName, lesson } = group;
        const localDate = format(
          toZonedTime(startsAt, 'Asia/Seoul'),
          'yyyy-MM-dd',
        );
        for (const { student } of groupStudents ?? []) {
          const studentId = `${student.grade}${student.class}-${student.studentCode}`;
          const groupKey = `GROUP#${groupId}`;
          const dailyStudentKey = `DATE#${localDate}#STUDENT#${studentId}`;
          await this.attendanceService.create({
            groupKey,
            dailyStudentKey,
            lessonId,
            lessonName: lesson?.lessonName ?? '과목',
            groupId,
            groupName: groupName ?? '반',
            studentId,
            studentName: student.name ?? '학생',
            start: group.start,
            end: group.end,
            duration,
            status: AttendanceStatus.PRESENT, // 기본값, 필요시 변경
          });
        }
      }),
    );

    return schooldays;
  }
}
