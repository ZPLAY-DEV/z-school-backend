import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel, Model } from 'nestjs-dynamoose';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import {
  generateGroupKey,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LessonAttendanceService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
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

      const groupKeys = lesson.groups.map((group) =>
        generateGroupKey(group.id),
      );

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

      return items.flat();
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
