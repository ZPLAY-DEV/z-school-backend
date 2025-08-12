import {
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
import { DataSource, EntityManager, Repository } from 'typeorm';

import { S3Service } from 'src/services/aws/s3.service';

import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { DailyNextStopDto } from 'src/domain/student/dto/update-student-next-stop.dto';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { normalizePhone } from 'src/helpers/phone';

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
  async getStudentTerms(id: number, filter?: string): Promise<Term[]> {
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

  //! this is create not upsert. maybe we need to change this.
  async create(dto: CreateStudentDto): Promise<Student> {
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
      if (existingStudent) {
        throw new ConflictException(
          'Student with same school, grade, class, and studentCode already exists',
        );
      }

      // 2.5. Student 데이터 정리
      const normalizedStudentDto = {
        ...studentDto,
        ...(studentDto.phone && { phone: normalizePhone(studentDto.phone) }),
        ...(studentDto.nextStop && { nextStop: studentDto.nextStop }),
      };

      // 3. Student 생성
      const student = manager.create(Student, {
        ...normalizedStudentDto,
        parentId: finalParentId,
        status: dto.status,
      });

      const savedStudent = await manager.save(Student, student);

      // 4. 관계 정보와 함께 반환
      return await manager.findOneOrFail(Student, {
        where: { id: savedStudent.id },
        relations: ['parent'],
      });
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

  //? 학생의 수업일 조회
  async getSchooldaysByDate(
    id: number,
    termId?: number,
    date?: string,
  ): Promise<Schoolday[]> {
    const student = await this.studentRepository.findOneOrFail({
      where: { id },
      relations: [
        'picks',
        'picks.group',
        'picks.group.schooldays',
        'picks.group.schooldays.departures',
      ],
    });

    // Student 의 모든 picks의 groups에서 schooldays를 수집
    const allSchooldays: Schoolday[] = [];

    if (!student.picks) {
      return [];
    }

    for (const pick of student.picks) {
      if (termId && pick.termId !== Number(termId)) {
        continue;
      }

      if (pick.group && pick.group.schooldays) {
        const schooldaysWithGroup = pick.group.schooldays
          .filter((schoolday) => {
            if (!date) {
              return true;
            }
            return schoolday.today === date || schoolday.original === date;
          })
          .map((schoolday) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { schooldays: _, ...groupWithoutSchooldays } = pick.group;
            return {
              ...schoolday,
              group: groupWithoutSchooldays as any, // 타입 단언으로 순환 참조 방지
            };
          });
        allSchooldays.push(...schooldaysWithGroup);
      }
    }

    return allSchooldays;
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
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .where('student.id = :id', { id })
      .andWhere('pick.endedBy IS NULL');

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
      .andWhere('pick.endedBy IS NULL');

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
      .andWhere('pick.endedBy IS NOT NULL');

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
      .andWhere('pick.endedBy IS NOT NULL');

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

    if (Object.keys(dto).length === 0) {
      return existingStudent;
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const { parent: parentDto, parentId, nextStops, ...studentDto } = dto;

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

      // nextStops 처리
      if (nextStops) {
        const nextStop = this._convertToString(nextStops);
        studentDto.nextStop = nextStop;
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
  async updateEscortInfo(
    id: number,
    dtos: DailyNextStopDto[],
  ): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    // nextStop 필드를 파이프(|)로 구분된 문자열로 저장
    const nextStop = this._convertToString(dtos);

    await this.studentRepository.update(id, {
      nextStop: nextStop,
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
    const activePicks = student.picks?.filter((pick) => !pick.endedBy);
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

  /**
   * 하교장소 DTO를 파이프(|)로 구분된 문자열로 변환
   * 형식: "장소|이름|전화번호,장소|이름|전화번호,..."
   * null 값은 빈 문자열로 처리
   */
  private _convertToString(dtos: DailyNextStopDto[]): string {
    if (!dtos || dtos.length === 0) {
      return '';
    }

    if (dtos.length < 6) {
      const firstItem = dtos[0];
      return `${firstItem.place}|${firstItem.name || ''}|${normalizePhone(firstItem.phone || '') || ''}`;
    } else {
      return dtos
        .map(
          (dto) =>
            `${dto.place}|${dto.name || ''}|${normalizePhone(dto.phone || '') || ''}`,
        )
        .join(',');
    }
  }
}
