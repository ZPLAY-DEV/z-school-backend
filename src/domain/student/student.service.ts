import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { S3Service } from 'src/services/aws/s3.service';
import {
  DataSource,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Or,
  Repository,
} from 'typeorm';
import { School } from '../school/entities/school.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { BookingStatus } from 'src/common/enums';
import { Pick } from '../pick/entities/pick.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Group } from '../group/entities/group.entity';
import { Schoolday } from '../schoolday/entities/schoolday.entity';
import { getKoreanWeekday } from 'src/helpers/date';
import { transformScheduleResponse } from 'src/helpers/group-schedule.util';
import { ScheduleResponseDto } from '../group/dto/schedule-response.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private dataSource: DataSource,
    private readonly s3Service: S3Service,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//
  async create(dto: CreateStudentDto): Promise<Student> {
    const { parent: parentDto, ...studentDto } = dto;

    let parentId: number | undefined;

    // 1. 학교 존재 여부 확인
    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. 보호자 존재 여부 확인 ( upsert )
    if (parentDto?.phone) {
      let parent = await this.parentRepository.findOne({
        where: { phone: parentDto.phone },
      });
      if (!parent) {
        parent = await this.parentRepository.save({
          ...parentDto,
        });
      }
      parentId = parent.id;
    }

    // 3. 학생 존재 여부 확인
    const existingStudent = await this.studentRepository.findOne({
      where: {
        schoolId: studentDto.schoolId,
        grade: studentDto.grade,
        class: studentDto.class,
        studentCode: studentDto.studentCode,
      },
    });

    if (existingStudent) {
      const updatedStudent = this.studentRepository.merge(existingStudent, {
        ...studentDto,
        parentId,
      });
      return this.studentRepository.save(updatedStudent);
    } else {
      const newStudent = this.studentRepository.create({
        ...studentDto,
        parentId,
      });
      return this.studentRepository.save(newStudent);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  //? upsert 여부 조회
  async dryRun(dto: CreateStudentDto): Promise<Student | null> {
    // In dryRun mode, we check if the student exists but don't create it
    const existingStudent = await this.studentRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        grade: dto.grade,
        class: dto.class,
        studentCode: dto.studentCode,
      },
    });

    return existingStudent ? existingStudent : null;
  }

  //? 학생 목록 조회
  async findAll(query: PaginateQuery): Promise<Paginated<Student>> {
    const queryBuilder = this.studentRepository.createQueryBuilder('student');
    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        isActive: [FilterOperator.EQ],
        studentType: [FilterOperator.EQ],
      },
    });
  }

  //? 재학 학생 조회
  async findActive(): Promise<Student[]> {
    return await this.studentRepository
      .createQueryBuilder('student')
      .orderBy('student.id', 'DESC')
      .where({ isActive: true })
      .getMany();
  }

  //? 학생 상세 정보 조회
  async findById(id: number): Promise<Student> {
    const student = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.groupStudents', 'groupStudents')
      .where('student.id = :id', { id })
      .getOne();

    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }

    return student;
  }

  //? 학생의 수업 형태에 따른 조회
  async findByIdWithStatus(
    id: number,
    status: BookingStatus,
  ): Promise<Group[]> {
    switch (status) {
      case BookingStatus.ENROLLED:
        return await this.findEnrolledGroups(id);
      case BookingStatus.CANCELED:
        return await this.findCancelledGroups(id);
      default:
        throw new BadRequestException(
          HttpErrorConstants.STUDENT_COURSE_STATUS_NOT_FOUND,
        );
    }
  }

  //? 학생의 수강중인 강좌 조회
  async findEnrolledGroups(studentId: number): Promise<Group[]> {
    // 1) pick에서 학생이 수강중인 강좌 조회
    const picks = await this.pickRepository.find({
      where: {
        studentId,
        endedBy: IsNull(),
      },
      relations: ['group'],
    });

    // 2) pick에서 학생이 수강중인 강좌의 id값 추출
    const groupIds = picks.map((pick) => pick.group.id);

    // 3) 학생이 수강중인 강좌 조회
    const groups = await this.groupRepository.find({
      where: {
        id: In(groupIds),
      },
      relations: ['sam', 'sam.instructor'],
    });

    return groups;
  }

  //? 학생의 수강취소 강좌 조회
  async findCancelledGroups(studentId: number): Promise<Group[]> {
    const picks = await this.pickRepository.find({
      where: {
        studentId,
        endedBy: Not(IsNull()),
      },
      relations: ['group'],
    });

    // 2) pick에서 학생이 수강중인 강좌의 id 추출
    const groupIds = picks.map((pick) => pick.group.id);

    // 3) 학생이 수강 취소한 강좌 조회
    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
      relations: ['sam', 'sam.instructor'],
    });

    return groups;
  }

  //? 학생의 수강 일정 조회
  async findBySchedule(
    studentId: number,
    dates: string[],
  ): Promise<ScheduleResponseDto> {
    const picks = await this.pickRepository.find({
      where: {
        studentId,
        startedOn: LessThanOrEqual(dates[dates.length - 1]),
        endedOn: Or(IsNull(), MoreThanOrEqual(dates[0])),
      },
      relations: [
        'group',
        'group.schooldays',
        'group.sam',
        'group.sam.instructor', // sam 하위의 instructor ( phone 값 추출을 위함 )
      ],
      select: {
        id: true,
        studentId: true,
        groupId: true,
        startedOn: true,
        endedOn: true,
        group: {
          id: true,
          groupName: true,
          location: true,
          weekday: true,
          start: true,
          end: true,
          schooldays: {
            id: true,
            startsAt: true,
            endsAt: true,
            duration: true,
          },
          sam: {
            id: true,
            alias: true,
            instructor: {
              id: true,
              phone: true,
            },
          },
        },
      },
    });

    // 2. 날짜별로 Group 그룹화
    const result: Record<string, Group[]> = {};
    dates.forEach((date) => {
      const koreanWeekday = getKoreanWeekday(date);
      result[`${date}(${koreanWeekday})`] = [];
    });

    // 3. 결과 값이 없을 경우 프론트에서 전달 받은 주단위 날짜 배열을 리턴
    if (!picks.length) {
      return transformScheduleResponse(dates, result);
    }

    picks.forEach((pick) => {
      const group = pick.group;
      // schooldays에서 dates 배열에 포함된 날짜만 필터링
      const filteredSchooldays = group.schooldays.filter((day) => {
        const dayDate = day.startsAt.toISOString().split('T')[0]; // "2025-05-20T13:50:00Z" -> "2025-05-20"
        return dates.includes(dayDate);
      });

      // 필터링된 schooldays가 있는 경우, 각 날짜에 Group 추가
      filteredSchooldays.forEach((schoolday) => {
        const dayDate = schoolday.startsAt.toISOString().split('T')[0];
        const koreanWeekday = getKoreanWeekday(dayDate);
        if (dates.includes(dayDate)) {
          // Group 객체 기반 schooldays와 sam을 부분 객체로 구성
          result[`${dayDate}(${koreanWeekday})`].push({
            ...group,
            schooldays: [
              {
                id: schoolday.id,
                startsAt: schoolday.startsAt,
                endsAt: schoolday.endsAt,
                duration: schoolday.duration,
              } as Schoolday,
            ],
            sam: group.sam
              ? {
                  id: group.sam.id,
                  alias: group.sam.alias,
                  instructor: group.sam.instructor
                    ? {
                        id: group.sam.instructor.id,
                        phone: group.sam.instructor.phone,
                      }
                    : undefined,
                }
              : undefined,
          } as Group);
        }
      });
    });
    return transformScheduleResponse(dates, result);
  }

  //? 학생의 수강 신청 내역 조회
  async findBookings(id: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: {
        studentId: id,
      },
      relations: ['offering'],
    });
  }
  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//
  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    // 1. 학교 존재 여부 확인
    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. Unique 제약 조건 확인 (학교-학년-반-번호) 기반
    const isStudent = await this.studentRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        grade: dto.grade,
        class: dto.class,
        studentCode: dto.studentCode,
        id: Not(id),
      },
    });

    if (isStudent) {
      throw new ConflictException(HttpErrorConstants.CONFLICT_STUDENT);
    }

    const student = await this.studentRepository.preload({ id, ...dto });

    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }

    return await this.studentRepository.save(student);
  }

  async updateStudentStatus(
    schoolId: number,
    studentId: number,
    dto: UpdateStudentStatusDto,
  ): Promise<Student> {
    // 1. 학교 존재 여부 확인
    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. 학생 존재 여부 확인
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_STUDENT);
    }

    // 3. 학생 상태 업데이트
    await this.studentRepository.save({
      ...student,
      status: dto.status,
    });

    return await this.studentRepository.findOneOrFail({
      where: { id: studentId },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  // note that this is hard-delete
  async remove(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
    });
    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_STUDENT);
    }
    return await this.studentRepository.remove(student);
  }

  // note that this is hard-delete
  async deleteImages(url: string): Promise<void> {
    await this.s3Service.delete(url);
  }
}
