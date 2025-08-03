import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { AttendanceStatus } from 'src/common/enums';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import {
  generateDailyStudentKey,
  generateGroupKey,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { In, IsNull, Repository } from 'typeorm';

@Injectable()
export class LessonAttendanceService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectModel('Attendance')
    private readonly model: Model<IAttendance, IAttendanceKey>,
  ) {}

  async findByDate(lessonId: number, date: string): Promise<IAttendance[]> {
    try {
      const lesson = await this.lessonRepository.findOneOrFail({
        where: { id: lessonId },
        relations: { groups: true },
      });
      if (!lesson) {
        throw new NotFoundException(`Lesson not found`);
      }

      // 1. 해당 날짜에 수업이 있는 그룹들만 필터링
      const groupIds = lesson.groups.map((group) => group.id);
      const schooldays = await this.schooldayRepository.find({
        where: {
          groupId: groupIds.length > 0 ? In(groupIds) : undefined,
          today: date,
        },
      });

      if (!schooldays || schooldays.length === 0) {
        return [];
      }

      // 수업이 있는 그룹들만 추려내기
      const activeGroupIds = schooldays.map((schoolday) => schoolday.groupId);
      const activeGroups = lesson.groups.filter((group) =>
        activeGroupIds.includes(group.id),
      );

      if (activeGroups.length === 0) {
        return [];
      }

      // 2. 활성 그룹들의 groupKeys 생성
      const groupKeys = activeGroups.map((group) => generateGroupKey(group.id));

      // 3. DynamoDB에서 기존 출석 레코드 조회
      const items = await Promise.all(
        groupKeys.map(async (groupKey) => {
          const prefix = `DATE#${date}`;
          const result = await this.model
            .query('groupKey')
            .eq(groupKey)
            .where('dailyStudentKey')
            .beginsWith(prefix)
            .exec();
          return result as IAttendance[];
        }),
      );

      const existingItems = items.flat();
      console.log(`💚 existing items: ${existingItems.length}`);

      // 4. 기존 레코드를 dailyStudentKey로 맵핑
      const itemMap = new Map<string, IAttendance>(
        existingItems.map((v) => [v.dailyStudentKey, v]),
      );

      // 5. 활성 그룹들의 모든 picks 조회
      const picks = await this.pickRepository.find({
        where: {
          groupId: activeGroupIds.length > 0 ? In(activeGroupIds) : undefined,
          endedBy: IsNull(),
        },
        relations: ['student', 'group', 'group.lesson'],
      });

      // 6. 각 pick에 대해 기존 레코드 또는 기본 레코드 반환
      return picks.map((pick) => {
        const dailyStudentKey = generateDailyStudentKey(
          date,
          pick.studentId,
          pick.student.grade,
          pick.student.class,
          pick.student.studentCode,
        );
        const groupKey = generateGroupKey(pick.group.id);

        return (
          itemMap.get(dailyStudentKey) ||
          ({
            groupId: pick.group.id,
            start: pick.group.start,
            end: pick.group.end,
            groupKey: groupKey,
            lessonId: pick.group.lessonId,
            lessonName: pick.group.lesson.lessonName,
            groupName: pick.group.groupName,
            weekday: pick.group.weekday,
            studentId: pick.student.id,
            studentName: pick.student.name,
            dailyStudentKey: dailyStudentKey,
            status: AttendanceStatus.INIT,
          } as IAttendance)
        );
      });
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(`DynamoDB read error: ${error.message}`);
    }
  }

  async getReport(lessonId: number, date: string): Promise<AttendanceReport[]> {
    const items = await this.findByDate(lessonId, date);
    return processAttendanceReport(items);
  }
}
