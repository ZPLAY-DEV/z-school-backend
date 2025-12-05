import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns-tz';
import {
  FilterOperator,
  FilterSuffix,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { ClassStatus } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { getKoreanWeekday } from 'src/helpers/date';
import { normalizePhone } from 'src/helpers/phone';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

@Injectable()
export class StudentService {
  private logger = new Logger(StudentService.name);

  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
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
    const school = await this.schoolRepository.findOneOrFail({
      where: { id: dto.schoolId },
    });

    return await this.dataSource.transaction(async (manager) => {
      const { parent: parentDto, parentId, ...studentDto } = dto;

      if (studentDto.klass) {
        studentDto.klass = studentDto.klass.trim().replace(/반$/, '');
      }

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
      if (studentDto.klass) {
        whereCondition.klass = studentDto.klass;
      }
      if (studentDto.bunho) {
        whereCondition.bunho = studentDto.bunho;
      }

      const existingStudent = await manager.findOne(Student, {
        where: whereCondition,
      });

      // 3. Student 데이터 정리
      const normalizedStudentDto = {
        ...studentDto,
        schoolName: school?.name || null,
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

    // 1. 부모 처리: parentId 우선, 없으면 parent 객체 방식 사용
    if (parentId) {
      // parentId가 제공된 경우 - 기존 부모 직접 참조
      const existingParent = await this.parentRepository.findOne({
        where: { id: parentId },
      });
      if (!existingParent) {
        throw new NotFoundException('Parent not found');
      }
    } else if (parentDto.id) {
      // parent.id가 있으면 기존 부모 연결
      const existingParent = await this.parentRepository.findOne({
        where: { id: parentDto.id },
      });
      if (!existingParent) {
        throw new NotFoundException('Parent not found');
      }
    }

    // 2. 중복 체크 - 동일 학교 내 학생 중복
    const whereClause: any = {
      schoolId: dto.schoolId,
      grade: dto.grade,
    };

    // class 조건 추가
    if (dto.klass) {
      whereClause.klass = dto.klass;
    }

    // bunho 조건 추가
    if (dto.bunho) {
      whereClause.bunho = dto.bunho;
    }

    return await this.studentRepository.findOne({
      where: whereClause,
      // relations: ['parent'],
    });
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

  //? 여러 학생 정보 조회
  async findByIds(ids: number[]): Promise<Student[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const students = await this.studentRepository.find({
      where: { id: In(ids) },
      relations: ['parent'],
    });

    return students;
  }

  //? 학생의 수업일 조회 (SQL 레벨 최적화)
  async getSchooldaysByDate(
    id: number,
    termId: number,
    date: string, //! YYYY-MM-DD
  ): Promise<Schoolday[]> {
    await this.studentRepository.findOneOrFail({
      where: { id },
    });

    const queryBuilder = this.dataSource
      .createQueryBuilder(Schoolday, 'schoolday')
      .leftJoinAndSelect('schoolday.group', 'group')
      .leftJoinAndSelect('schoolday.departures', 'departures')
      .leftJoin('group.picks', 'pick')
      .where('pick.studentId = :studentId', { studentId: id })
      .andWhere('schoolday.termId = :termId', { termId })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .andWhere('(schoolday.today = :date OR schoolday.original = :date)', {
        date,
      });

    const schooldays = await queryBuilder.getMany();
    return schooldays;
  }

  //? 학생의 수업일 조회 (SQL 레벨 최적화)
  async getAllSchooldays(
    id: number,
    termId: number,
    monthStr?: string, //! in YYYY-MM format
  ): Promise<Schoolday[]> {
    // QueryBuilder를 사용해서 SQL 레벨에서 필터링
    const queryBuilder = this.dataSource
      .createQueryBuilder(Schoolday, 'schoolday')
      .leftJoin('schoolday.group', 'group')
      .leftJoinAndSelect('schoolday.departures', 'departures')
      .leftJoin('group.picks', 'pick')
      .where('pick.studentId = :studentId', { studentId: id })
      .andWhere('group.status = :status', { status: ClassStatus.ACTIVE })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .andWhere('pick.termId = :termId', { termId: Number(termId) });

    if (monthStr) {
      const [year, month] = monthStr.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1); // 월은 0부터 시작하므로 -1
      const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 다음 달의 0일 = 이번 달의 마지막일
      // startsAt이 기간 안에 있는 경우를 처리 (datetime 비교로 효율성 향상)
      queryBuilder.andWhere(
        'schoolday.startsAt >= :startDate AND schoolday.startsAt <= :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    //! monthStr 관계없이 모두 동일한 날짜 조건으로 조회후 필터링
    queryBuilder.orWhere(
      '(schoolday.original IS NOT NULL AND pick.studentId = :studentId)',
      { studentId: id },
    );
    const schooldays = await queryBuilder
      .orderBy('schoolday.weekNumber', 'ASC')
      .getMany();

    // original이 null이 아닌 아이템들에 대해 중복 아이템 생성
    let result: Schoolday[] = [];

    for (const schoolday of schooldays) {
      result.push(schoolday);
      // original이 null이 아닌 경우 중복 아이템 생성 (id만 0으로 설정)
      if (schoolday.original !== null) {
        const duplicate = { ...schoolday };
        duplicate.id = 0;
        duplicate.today = schoolday.original;
        duplicate.original = schoolday.today;
        duplicate.weekday = getKoreanWeekday(schoolday.original);
        duplicate.note = 'red';
        result.push(duplicate);
      }
    }

    // monthStr이 있을 때 today 속성으로 월별 필터링
    if (monthStr) {
      const [, targetMonth] = monthStr.split('-').map(Number);
      result = result.filter((schoolday) => {
        const [, schooldayMonth] = schoolday.today.split('-').map(Number);
        return schooldayMonth === targetMonth;
      });
    }
    // today 날짜 순차적으로 정렬
    result.sort((a, b) => a.today.localeCompare(b.today));

    return result;
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
  //? 수정시에는 절대로 parent 정보를 새롭게 생성하지 않고 기존 parent 를 업데이트한다.
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.studentRepository.findOneOrFail({
      where: { id },
      relations: ['parent'],
    });

    if (Object.keys(dto).length === 0) {
      return student;
    }

    // 학년/반/번호 중복 체크
    const grade = dto.grade ?? student.grade;
    const klass = dto.klass ?? student.klass;
    const bunho = dto.bunho ?? student.bunho;

    const duplicate = await this.studentRepository.findOne({
      where: {
        schoolId: student.schoolId,
        grade,
        klass,
        bunho,
      },
    });

    if (duplicate && duplicate.id !== id) {
      throw new ConflictException(
        '해당 학년,반,번호를 사용하는 학생이 이미 존재합니다.',
      );
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const { parent: parentDto, parentId, ...studentDto } = dto;
      let finalParentId = parentId ?? student.parentId;

      // 1. 부모 정보 처리
      if (parentDto?.phone) {
        const normalizedPhone = normalizePhone(parentDto.phone);
        const existingParent = await manager.findOne(Parent, {
          where: { phone: normalizedPhone },
        });

        if (existingParent) {
          // 해당 phone을 가진 parent가 이미 존재 → 그 parent로 연결
          finalParentId = existingParent.id;
        } else if (student.parentId) {
          // 해당 phone이 없고, 기존 parent가 있으면 → 기존 parent 정보 업데이트
          await manager.update(Parent, student.parentId, {
            ...(parentDto.name && { name: parentDto.name }),
            phone: normalizedPhone,
            ...(parentDto.note && { note: parentDto.note }),
            ...(parentDto.termsAgreedAt && {
              termsAgreedAt: parentDto.termsAgreedAt,
            }),
          });
        }
      } else if (parentDto && student.parentId) {
        // phone 변경 없이 다른 필드만 업데이트
        await manager.update(Parent, student.parentId, {
          ...(parentDto.name && { name: parentDto.name }),
          ...(parentDto.note && { note: parentDto.note }),
          ...(parentDto.termsAgreedAt && {
            termsAgreedAt: parentDto.termsAgreedAt,
          }),
        });
      }

      // 2. 학생 정보 업데이트
      const normalizedDto = {
        ...studentDto,
        ...(studentDto.phone && { phone: normalizePhone(studentDto.phone) }),
        parentId: finalParentId,
      };

      await manager.update(Student, id, normalizedDto);

      return await manager.findOneOrFail(Student, {
        where: { id },
        relations: ['parent'],
      });
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  //? 학생 삭제 (soft delete)
  async remove(id: number, forceDelete = false): Promise<Student> {
    return await this.dataSource.transaction(async (manager) => {
      // ID로 student 조회
      const student = await manager.findOne(Student, {
        where: { id },
        relations: ['picks'], // 수강 중인 picks 함께 조회
      });

      if (!student) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      // picks가 있는 경우 처리
      if (student.picks && student.picks.length > 0) {
        const activePicks = student.picks.filter((v: Pick) => v.isActive);
        const inactivePicks = student.picks.filter((v: Pick) => !v.isActive);

        if (!forceDelete) {
          let errorMessage = 'Cannot delete student with existing picks';
          if (activePicks.length > 0) {
            errorMessage += ` (${activePicks.length} active picks)`;
          }
          if (inactivePicks.length > 0) {
            errorMessage += ` (${inactivePicks.length} inactive picks)`;
          }
          errorMessage += '. Use forceDelete=true to delete picks first.';

          throw new BadRequestException(errorMessage);
        }

        // forceDelete가 true인 경우 picks를 먼저 삭제
        if (activePicks.length > 0) {
          throw new BadRequestException(
            `Cannot force delete student with ${activePicks.length} active picks. Please deactivate picks first.`,
          );
        }

        // 비활성화된 picks만 삭제
        if (inactivePicks.length > 0) {
          await manager.delete(Pick, {
            studentId: id,
            isActive: false,
          });
        }
      }

      // 삭제일이 없으면 soft delete
      if (!student.deletedAt) {
        await manager.update(Student, id, {
          deletedAt: new Date(),
        });
      }

      // 삭제된 학생 정보 반환
      return await manager.findOneOrFail(Student, {
        where: { id },
        withDeleted: true,
      });
    });
  }
}
