import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns-tz';
import { InjectModel, Model } from 'nestjs-dynamoose';
import {
  FilterOperator,
  FilterSuffix,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { AttendanceStatus } from 'src/common/enums';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import {
  generateDailyStudentKey,
  generateGroupKey,
} from 'src/domain/attendance/utils/attendance.utils';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { NextStopDto } from 'src/domain/student/dto/next-stop.dto';
import { SchooldayWithAttendanceDto } from 'src/domain/student/dto/schoolday-with-attendance.dto';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { normalizePhone } from 'src/helpers/phone';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, EntityManager, Repository } from 'typeorm';

@Injectable()
export class StudentService {
  private logger = new Logger(StudentService.name);

  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectModel('Attendance')
    private readonly model: Model<IAttendance, IAttendanceKey>,
    private readonly s3Service: S3Service,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  /**
   * 학생이 속한 학교의 term 중에서 status에 따라 term 반환
   * @param filter - 없으면 upcoming만, 'ongoing'이면 upcoming + ongoing 모두 반환
   */
  async getStudentTerms(
    id: number,
    filter?: string,
    // schoolId?: number,
  ): Promise<Term[]> {
    const today = format(new Date(), 'yyyy-MM-dd', { timeZone: 'Asia/Seoul' });

    const student = await this.studentRepository.findOneOrFail({
      where: { id },
      relations: ['parent'],
    });

    const queryBuilder = this.termRepository
      .createQueryBuilder('term')
      .where('term.schoolId = :schoolId', { schoolId: student.schoolId });

    if (filter === 'ongoing') {
      // upcoming + ongoing: 시작 전이거나 진행 중인 term들
      queryBuilder.andWhere(
        '(term.start > :today) OR (term.start <= :today AND term.end >= :today)',
        { today },
      );
    } else {
      // 기본값: upcoming만 (시작 전인 term들만)
      queryBuilder.andWhere('term.start > :today', { today });
    }

    return await queryBuilder.orderBy('term.start', 'ASC').getMany();
  }

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  /**
   * 학생 정보를 upsert합니다.
   * 동일한 학교, 학년, 반, 학생코드를 가진 학생이 있으면 업데이트하고,
   * 없으면 새로 생성합니다.
   */
  async create(
    dto: CreateStudentDto,
  ): Promise<{ student: Student; isCreated: boolean }> {
    return await this.dataSource.transaction(async (manager) => {
      const { parent: parentDto, parentId, ...studentDto } = dto;

      let finalParentId: number;

      // 1. 부모 처리: parentId 우선, 없으면 parent 객체 방식 사용
      if (parentId) {
        // parentId가 제공된 경우 - 기존 부모 직접 참조
        const existingParent = await manager.findOne(Parent, {
          where: { id: parentId },
        });
        if (!existingParent) {
          throw new NotFoundException('Parent not found');
        }
        finalParentId = parentId;
      } else if (parentDto.id) {
        // parent.id가 있으면 기존 부모 연결
        const existingParent = await manager.findOne(Parent, {
          where: { id: parentDto.id },
        });
        if (!existingParent) {
          throw new NotFoundException('Parent not found');
        }
        finalParentId = parentDto.id;
      } else {
        const existingParent = await manager.findOne(Parent, {
          where: { phone: normalizePhone(parentDto.phone) },
        });
        if (existingParent) {
          finalParentId = existingParent.id;
        } else {
          // 새로운 부모 생성
          const newParent = manager.create(Parent, {
            userId: parentDto.userId,
            name: parentDto.name,
            phone: normalizePhone(parentDto.phone),
            note: parentDto.note,
            termsAgreedAt: parentDto.termsAgreedAt,
          });
          const savedParent = await manager.save(Parent, newParent);
          finalParentId = savedParent.id;
        }
      }

      // 2. 중복 체크 - 동일 학교 내 중복 확인
      const whereCondition: any = {
        schoolId: studentDto.schoolId,
        grade: studentDto.grade,
      };
      if (studentDto.class) {
        whereCondition.class = studentDto.class;
      }
      if (studentDto.studentCode) {
        whereCondition.studentCode = studentDto.studentCode;
      }

      const existingStudent = await manager.findOne(Student, {
        where: whereCondition,
      });

      // 3. Student 데이터 정리
      const normalizedStudentDto = {
        ...studentDto,
        ...(studentDto.phone && { phone: normalizePhone(studentDto.phone) }),
        parentId: finalParentId,
        status: dto.status,
      };

      let savedStudent: Student;
      let isCreated: boolean;

      if (existingStudent) {
        // 4. 기존 학생이 있으면 업데이트
        await manager.update(Student, existingStudent.id, normalizedStudentDto);
        savedStudent = existingStudent;
        isCreated = false;
      } else {
        // 4. 기존 학생이 없으면 새로 생성
        const student = manager.create(Student, normalizedStudentDto);
        savedStudent = await manager.save(Student, student);
        isCreated = true;
      }

      // 5. 관계 정보와 함께 반환
      const result = await manager.findOneOrFail(Student, {
        where: { id: savedStudent.id },
        relations: ['parent'],
      });

      return { student: result, isCreated };
    });
  }

  //? upsert 여부 조회
  async dryRun(dto: CreateStudentDto): Promise<Student | null> {
    const { parent: parentDto, parentId } = dto;

    let targetParentId: number | null = null;

    // 1. 부모 처리: parentId 우선, 없으면 parent 객체 방식 사용
    if (parentId) {
      // parentId가 제공된 경우 - 기존 부모 직접 참조
      const existingParent = await this.parentRepository.findOne({
        where: { id: parentId },
      });
      if (!existingParent) {
        throw new NotFoundException('Parent not found');
      }
      targetParentId = parentId;
    } else if (parentDto.id) {
      // parent.id가 있으면 기존 부모 연결
      const existingParent = await this.parentRepository.findOne({
        where: { id: parentDto.id },
      });
      if (!existingParent) {
        throw new NotFoundException('Parent not found');
      }
      targetParentId = parentDto.id;
    } else if (parentDto.phone) {
      const existingParent = await this.parentRepository.findOne({
        where: { phone: normalizePhone(parentDto.phone) },
      });
      if (existingParent) {
        targetParentId = existingParent.id;
      } else {
        // 새로운 부모 생성 방식 - 전화번호로 기존 부모 확인
        const existingParent = await this.parentRepository.findOne({
          where: { phone: normalizePhone(parentDto.phone) },
        });
        if (existingParent) {
          targetParentId = existingParent.id;
        } else {
          // 새로운 부모가 생성될 예정이므로 중복 체크 불가
          return null;
        }
      }
    }

    // 2. 중복 체크 - 동일 학교 내 학생 중복
    if (targetParentId) {
      const whereCondition: any = {
        schoolId: dto.schoolId,
        grade: dto.grade,
      };

      // class 조건 추가
      if (dto.class) {
        whereCondition.class = dto.class;
      }

      // studentCode 조건 추가
      if (dto.studentCode) {
        whereCondition.studentCode = dto.studentCode;
      }

      const existingStudent = await this.studentRepository.findOne({
        where: whereCondition,
        relations: ['parent'],
      });

      return existingStudent || null;
    }

    return null;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  //? 학생 상세 정보 조회
  async findById(id: number, termId?: number): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: [
        'school',
        'parent',
        'picks',
        'picks.group',
        // 'picks.group.schooldays',
      ],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (termId) {
      student.picks = student.picks?.filter((pick) => pick.termId === termId);
    }

    return student;
  }

  //? 학생의 수업일 조회 (SQL 레벨 최적화)
  async getSchooldaysByDate(
    id: number,
    date: string,
    termId?: number,
  ): Promise<SchooldayWithAttendanceDto[]> {
    const student = await this.studentRepository.findOneOrFail({
      where: { id },
    });

    // QueryBuilder를 사용해서 SQL 레벨에서 필터링
    const queryBuilder = this.dataSource
      .createQueryBuilder(Schoolday, 'schoolday')
      .leftJoinAndSelect('schoolday.group', 'group')
      .leftJoinAndSelect('schoolday.departures', 'departures')
      .leftJoin('group.picks', 'pick')
      .where('pick.studentId = :studentId', { studentId: id })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .andWhere('(schoolday.today = :date OR schoolday.original = :date)', {
        date,
      });

    if (termId) {
      queryBuilder.andWhere('schoolday.termId = :termId', { termId });
    }

    const schooldays = await queryBuilder.getMany();
    const attendanceKeys: IAttendanceKey[] = schooldays.map((v) => {
      const groupKey = generateGroupKey(v.groupId);
      const dailyStudentKey = generateDailyStudentKey(
        v.today,
        student.id,
        student.grade,
        student.class,
        student.studentCode,
      );
      return {
        groupKey,
        dailyStudentKey,
      };
    });
    const attendances = await this.fetchByAttendanceKeys(attendanceKeys);

    // attendances를 dailyStudentKey로 매핑
    const attendanceMap = new Map<string, IAttendance>();
    attendances.forEach((attendance) => {
      attendanceMap.set(attendance.dailyStudentKey, attendance);
    });

    return schooldays.map((schoolday): SchooldayWithAttendanceDto => {
      const dailyStudentKey = generateDailyStudentKey(
        schoolday.today,
        student.id,
        student.grade,
        student.class,
        student.studentCode,
      );
      const attendance = attendanceMap.get(dailyStudentKey);

      return {
        id: schoolday.id,
        startsAt: schoolday.startsAt,
        endsAt: schoolday.endsAt,
        today: schoolday.today,
        original: schoolday.original,
        groupId: schoolday.groupId,
        schoolId: schoolday.schoolId,
        termId: schoolday.termId,
        createdAt: schoolday.createdAt,
        updatedAt: schoolday.updatedAt,
        group: schoolday.group,
        departures: schoolday.departures,
        // attendance: attendance,
        status: attendance?.status || AttendanceStatus.NONE,
        parentNote: attendance?.parentNote || null,
      };
    });
  }

  //? 학생의 수업일 조회 (SQL 레벨 최적화)
  async getAllSchooldaysByTermId(
    id: number,
    termId: number,
  ): Promise<Schoolday[]> {
    // QueryBuilder를 사용해서 SQL 레벨에서 필터링
    const queryBuilder = this.dataSource
      .createQueryBuilder(Schoolday, 'schoolday')
      .leftJoinAndSelect('schoolday.group', 'group')
      .leftJoinAndSelect('schoolday.departures', 'departures')
      .leftJoin('group.picks', 'pick')
      .where('pick.studentId = :studentId', { studentId: id })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });

    const schooldays = await queryBuilder.getMany();

    // 순환 참조 방지를 위해 group에서 schooldays 제거
    return schooldays.map((schoolday) => {
      if (schoolday.group) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { schooldays: _, ...groupWithoutSchooldays } = schoolday.group;
        return {
          ...schoolday,
          group: groupWithoutSchooldays as any, // 타입 단언으로 순환 참조 방지
        };
      }
      return schoolday;
    });
  }

  //? 학생의 수강 신청 내역 조회
  async findBookingsById(id: number, termId?: number): Promise<Booking[]> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.studentId = :studentId', { studentId: id });

    // termId가 제공되면 해당 학기의 booking만 필터링
    if (termId) {
      queryBuilder.andWhere('offering.termId = :termId', {
        termId: Number(termId),
      });
    }

    return await queryBuilder.getMany();
  }

  //? 학생의 수강중인 반 조회
  async listGroups(id: number, termId?: number): Promise<Group[]> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .where('pick.studentId = :id', { id })
      .andWhere('pick.isActive = :isActive', { isActive: true });

    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    return await queryBuilder.getMany();
  }

  //? 학생의 수강중인 반 조회 (페이지네이션)
  async infiniteListGroups(
    id: number,
    query: PaginateQuery,
    termId?: number,
  ): Promise<Paginated<Group>> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .where('pick.studentId = :id', { id })
      .andWhere('pick.isActive = :isActive', { isActive: true });

    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    const config: PaginateConfig<Group> = {
      sortableColumns: ['id', 'groupName'],
      filterableColumns: {
        groupName: [FilterOperator.ILIKE],
      },
    };

    return paginate(query, queryBuilder, config);
  }

  //? 학생의 수강취소된 반 조회
  async listCanceledGroups(id: number, termId?: number): Promise<Group[]> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .where('pick.studentId = :id', { id })
      .andWhere('pick.isActive = :isActive', { isActive: false });

    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    return await queryBuilder.getMany();
  }

  //? 학생의 수강취소된 반 조회 (페이지네이션)
  async infiniteListCanceledGroups(
    id: number,
    query: PaginateQuery,
    termId?: number,
  ): Promise<Paginated<Group>> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .where('pick.studentId = :id', { id })
      .andWhere('pick.isActive = :isActive', { isActive: false });

    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    const config: PaginateConfig<Group> = {
      sortableColumns: ['id', 'groupName'],
      filterableColumns: {
        groupName: [FilterOperator.ILIKE],
      },
    };

    return paginate(query, queryBuilder, config);
  }

  //? 학생 목록 조회 (페이지네이션)
  async infiniteList(query: PaginateQuery): Promise<Paginated<Student>> {
    const queryBuilder = this.studentRepository.createQueryBuilder('student');

    // termId가 없는 경우 기본 처리
    const config: PaginateConfig<Student> = {
      relations: ['picks'],
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name', 'phone', 'note'],
      filterableColumns: {
        schoolId: [FilterOperator.EQ],
        picks: [FilterOperator.NULL, FilterSuffix.NOT],
        name: [FilterOperator.ILIKE],
        phone: [FilterOperator.ILIKE],
        note: [FilterOperator.ILIKE],
      },
    };

    return paginate(query, queryBuilder, config);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    const existingStudent = await this.studentRepository.findOneOrFail({
      where: { id },
      relations: ['parent'],
    });

    const student = await this.studentRepository.findOneOrFail({
      where: {
        class: dto.class,
        grade: dto.grade,
        studentCode: dto.studentCode,
        schoolId: existingStudent.schoolId,
      },
    });

    if (student && student.id !== id) {
      throw new ConflictException('아뿔사! 학년,반,번호의 다른학생 이미 존재');
    }

    if (Object.keys(dto).length === 0) {
      return existingStudent;
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const { parent: parentDto, parentId, ...studentDto } = dto;

      // 부모 정보 처리
      let finalParentId = existingStudent.parentId;
      if (parentId) {
        finalParentId = parentId;
      } else if (parentDto && existingStudent.parentId) {
        await manager.update(Parent, existingStudent.parentId, {
          ...(parentDto.name && { name: parentDto.name }),
          ...(parentDto.phone && { phone: normalizePhone(parentDto.phone) }),
          ...(parentDto.note && { note: parentDto.note }),
          ...(parentDto.termsAgreedAt && {
            termsAgreedAt: parentDto.termsAgreedAt,
          }),
        });
      }

      // 학생 데이터 정리
      const normalizedData = {
        ...studentDto,
        ...(studentDto.phone && { phone: normalizePhone(studentDto.phone) }),
        parentId: finalParentId,
      };

      // unique 제약 조건 체크 및 upsert
      const hasUniqueFieldChanges = ['grade', 'class', 'studentCode'].some(
        (field) => normalizedData[field] !== undefined,
      );

      if (hasUniqueFieldChanges) {
        const targetCondition = {
          schoolId: existingStudent.schoolId,
          grade: normalizedData.grade ?? existingStudent.grade,
          class: normalizedData.class ?? existingStudent.class,
          studentCode:
            normalizedData.studentCode ?? existingStudent.studentCode,
        };

        const conflictStudent = await manager.findOne(Student, {
          where: targetCondition,
        });

        if (conflictStudent && conflictStudent.id !== id) {
          // 기존 레코드에 병합 후 현재 레코드 삭제 (hard delete)
          await manager.update(Student, conflictStudent.id, normalizedData);
          await manager.delete(Student, id);

          return await manager.findOneOrFail(Student, {
            where: { id: conflictStudent.id },
            relations: ['parent'],
          });
        }
      }

      // 일반 업데이트
      await manager.update(Student, id, normalizedData);
      return await manager.findOneOrFail(Student, {
        where: { id },
        relations: ['parent'],
      });
    });
  }

  /**
   * 학생 하교장소 정보 수정
   * 요일별 하교 후 가는 장소와 함께 가는 사람 정보를 업데이트합니다.
   * @deprecated update() 메서드의 nextStops 필드를 사용하세요.
   */
  async updateEscortInfo(id: number, dtos: NextStopDto[]): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    await this.studentRepository.update(id, {
      nextStops: dtos,
    });

    return await this.studentRepository.findOneOrFail({
      where: { id },
      relations: ['parent'],
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  //? 학생 삭제 (soft delete)
  async remove(id: number): Promise<Student> {
    // ID로 student 조회
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['picks'], // 수강 중인 picks 함께 조회
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    // 수강 중인 picks가 있는지 확인
    const activePicks = student.picks?.filter((v: Pick) => v.isActive);
    if (activePicks && activePicks.length > 0) {
      throw new Error('Cannot delete student with active picks');
    }

    // 삭제일이 없으면 soft delete
    if (!student.deletedAt) {
      await this.studentRepository.update(id, {
        deletedAt: new Date(),
      });
    }

    // 삭제된 학생 정보 반환
    return await this.studentRepository.findOneOrFail({
      where: { id },
      withDeleted: true,
    });
  }

  private async fetchByAttendanceKeys(
    keys: IAttendanceKey[],
  ): Promise<IAttendance[]> {
    try {
      if (keys.length === 0) {
        return [];
      }

      // 25개 미만이므로 한 번의 batchGet으로 충분
      const batchResults = await this.model.batchGet(keys);

      // 결과 필터링 및 반환
      const results: IAttendance[] = [];
      for (const item of batchResults) {
        if (item) {
          results.push(item as IAttendance);
        }
      }

      return results;
    } catch (error) {
      console.error(`[dynamodb] fetchByAttendanceKeys error:`, error);
      throw new BadRequestException(error.message);
    }
  }
}
