import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format, fromZonedTime } from 'date-fns-tz';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { AttendanceStatus } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { UpdateAttendanceDto } from 'src/domain/attendance/dto/update-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import {
  calculateTtl,
  generateDailyStudentKey,
  generateGroupKey,
  processAttendanceReport,
} from 'src/domain/attendance/utils/attendance.utils';
import { Group } from 'src/domain/group/entities/group.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { getDuration } from 'src/helpers/time';
import { NotificationService } from 'src/services/notification/notification.service';
import { Repository } from 'typeorm';

@Injectable()
export class GroupAttendanceService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectModel('Attendance')
    private readonly model: Model<IAttendance, IAttendanceKey>,
    private readonly notificationService: NotificationService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Notify
  //? ---------------------------------------------------------------------- ?//

  async notifyStart(
    groupId: number, //! e.g. 48
    date: string, //! e.g. "2025-06-09" <- 하이픈 반드시 포함
  ): Promise<number> {
    // MySQL 읽고
    const group = await this.groupRepository.findOneOrFail({
      where: { id: groupId },
      relations: [
        'lesson',
        'groupStudents',
        'groupStudents.student',
        'groupStudents.student.parent',
      ],
    });
    const students = group.groupStudents.map((v) => v.student);
    const groupKey = generateGroupKey(group.id);
    // Dynamo 읽고
    const items = await this.findByDate(groupKey, date);
    const studentIds = items
      .filter((v) => v.status === AttendanceStatus.PENDING)
      .map((v) => v.studentId);
    const itemKeys: IAttendanceKey[] = items
      .filter((v) => v.status === AttendanceStatus.PENDING)
      .map((v) => ({
        groupKey,
        dailyStudentKey: v.dailyStudentKey,
      }));
    students.filter((v) => studentIds.includes(v.id));
    const notifications = students.map((v) => {
      return {
        id: v.parent.id,
        title: `${group.lesson.schoolName}`,
        body: `${v.name} 학생 ${group.lesson.lessonName} 수업 시작했습니다.`,
      };
    });
    await this.notificationService.sendMessagesToParents({
      messageType: 'ping.class',
      notifications,
      schoolId: group.lesson.schoolId,
      role: 'PARENT',
    });
    await this.updateStatusesBulk(itemKeys, AttendanceStatus.PRESENT);
    return notifications.length;
  }

  async notifyEnd(
    groupId: number, //! e.g. 48
    date: string, //! e.g. "2025-06-09" <- 하이픈 반드시 포함
  ): Promise<number> {
    // MySQL 읽고
    const group = await this.groupRepository.findOneOrFail({
      where: { id: groupId },
      relations: [
        'lesson',
        'groupStudents',
        'groupStudents.student',
        'groupStudents.student.parent',
      ],
    });
    const students = group.groupStudents.map((v) => v.student);
    const groupKey = generateGroupKey(group.id);
    // Dynamo 읽고
    const items = await this.findByDate(groupKey, date);
    const studentIds = items
      .filter(
        (v) =>
          v.status === AttendanceStatus.PRESENT ||
          v.status === AttendanceStatus.LATE ||
          v.status === AttendanceStatus.EXCUSED_LATE,
      )
      .map((v) => v.studentId);
    students.filter((v) => studentIds.includes(v.id));
    const notifications = students.map((v) => {
      return {
        id: v.parent.id,
        title: `${group.lesson.schoolName}`,
        body: `${v.name} 학생 ${group.lesson.lessonName} 수업 종료했습니다.`,
      };
    });
    await this.notificationService.sendMessagesToParents({
      messageType: 'ping.class',
      notifications,
      schoolId: group.lesson.schoolId,
      role: 'PARENT',
    });
    return notifications.length;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Create 또는 Update
  //? ---------------------------------------------------------------------- ?//

  async upsert(
    groupId: number,
    date: string, //! e.g. "2025-06-08" <- 하이픈 반드시 포함
    studentId: number,
    dto: UpdateAttendanceDto,
  ): Promise<IAttendance> {
    const group = await this.groupRepository.findOneOrFail({
      where: { id: groupId },
      relations: ['lesson', 'schooldays'],
    });
    const student = await this.studentRepository.findOneOrFail({
      where: { id: studentId },
    });
    const schoolday = group.schooldays.find(
      (v) =>
        format(fromZonedTime(v.startsAt, 'Asia/Seoul'), 'yyyy-MM-dd') ===
        `${date}`,
    );
    if (!schoolday) {
      throw new NotFoundException(HttpErrorConstants.NO_CLASS_DAY);
    }

    const duration = getDuration(group.start, group.end);
    const expires = calculateTtl(new Date());
    const groupKey = generateGroupKey(group.id);
    const dailyStudentKey = generateDailyStudentKey(
      date,
      student.id,
      student.grade,
      student.class,
      student.studentCode,
    );

    const itemKey = {
      groupKey,
      dailyStudentKey,
    };
    const itemDto = {
      ...dto, // status, parentNote, schoolNote, isRead
      lessonId: group.lessonId,
      lessonName: group.lesson.lessonName,
      groupId: group.id,
      groupName: group.groupName,
      studentId: student.id,
      studentName: student.name,
      start: group.start,
      end: group.end,
      duration: duration,
      expires: expires,
    };

    // intentionally using exception-driven control flow
    try {
      const result = await this.model.create({
        ...itemKey,
        ...itemDto,
      });
      console.log(
        '✅ created new attendance:',
        JSON.stringify(result, null, 2),
      );
      return result;
    } catch (error) {
      if (
        error.name === 'ConditionalCheckFailedException' ||
        error.code === 'ConditionalCheckFailedException'
      ) {
        try {
          const result = await this.model.update(itemKey, itemDto);
          console.log(
            '✅ updated existing attendance:',
            JSON.stringify(result, null, 2),
          );
          return result;
        } catch (updateError) {
          console.error(`[dynamodb] update error`, updateError);
          throw new BadRequestException(HttpErrorConstants.DYNAMO_UPDATE);
        }
      } else {
        console.error(`[dynamodb] update error`, error);
        throw new BadRequestException(HttpErrorConstants.DYNAMO_CREATE);
      }
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findByDate(groupKey: string, date: string): Promise<IAttendance[]> {
    try {
      const prefix = `DATE#${date}`;
      const result = await this.model
        .query('groupKey')
        .eq(groupKey)
        .where('dailyStudentKey')
        .beginsWith(prefix)
        .exec();
      return result as IAttendance[];
    } catch (error) {
      console.error(`[dynamodb] error`, error);
      throw new BadRequestException(HttpErrorConstants.DYNAMO_READ);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Report
  //? ---------------------------------------------------------------------- ?//

  async getReport(groupKey: string, date: string): Promise<AttendanceReport[]> {
    const items = await this.findByDate(groupKey, date);
    return processAttendanceReport(items);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Bulk Status Update
  //? ---------------------------------------------------------------------- ?//

  async updateStatusesBulk(
    keys: IAttendanceKey[],
    status: AttendanceStatus,
  ): Promise<IAttendance[]> {
    try {
      const updatePromises = keys.map((key) =>
        this.model.update(key, { status }),
      );
      const results = await Promise.all(updatePromises);
      console.log(`✅ Bulk updated ${results.length} attendance records`);
      return results;
    } catch (error) {
      console.error(`[dynamodb] bulk update error`, error);
      throw new BadRequestException(HttpErrorConstants.DYNAMO_UPDATE);
    }
  }
}
