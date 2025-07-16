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
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';

import { S3Service } from 'src/services/aws/s3.service';

import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
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

  //! somehow we prefer to use upsert instead of create
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

      // class 조건 추가 (null 처리)
      if (studentDto.class !== undefined) {
        whereCondition.class = studentDto.class || IsNull();
      }

      // studentCode 조건 추가 (null 처리)
      if (studentDto.studentCode !== undefined) {
        whereCondition.studentCode = studentDto.studentCode || IsNull();
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
        ...(studentDto.escortPhone && {
          escortPhone: normalizePhone(studentDto.escortPhone),
        }),
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

      // class 조건 추가 (null 처리)
      if (dto.class !== undefined) {
        whereCondition.class = dto.class || IsNull();
      }

      // studentCode 조건 추가 (null 처리)
      if (dto.studentCode !== undefined) {
        whereCondition.studentCode = dto.studentCode || IsNull();
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
  async findById(id: number): Promise<Student> {
    const student = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .where('student.id = :id', { id })
      .getOne();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  //? 학생의 수업일 조회
  async findSchooldaysById(id: number, termId?: number): Promise<Schoolday[]> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .where('student.id = :id', { id })
      .andWhere('pick.endedBy IS NULL'); // 현재 수강중인 반만 조회

    // termId가 제공되면 해당 학기의 picks만 필터링
    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    const student = await queryBuilder.getOne();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 학생의 picks에서 모든 schooldays 추출
    const schooldays: Schoolday[] = [];
    student.picks?.forEach((pick) => {
      if (pick.group && pick.group.schooldays) {
        schooldays.push(...pick.group.schooldays);
      }
    });

    // 중복 제거 (같은 schoolday가 여러 group에 있을 수 있다면...)
    // const uniqueSchooldays = schooldays.filter(
    //   (schoolday, index, self) =>
    //     index === self.findIndex((s) => s.id === schoolday.id),
    // );

    return schooldays;
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
    const config: PaginateConfig<Student> = {
      sortableColumns: ['id', 'name'],
      filterableColumns: {
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
    // 1. 기존 학생 존재 여부 확인
    const existingStudent = await this.studentRepository.findOneOrFail({
      where: { id },
      relations: ['parent'],
    });

    // 2. 업데이트할 데이터가 있는지 확인
    const fieldsToUpdate = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdateStudentDto] !== undefined,
    );

    if (fieldsToUpdate.length === 0) {
      return existingStudent;
    }

    // 3. 트랜잭션 내에서 업데이트 수행
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const { parent: parentDto, parentId, ...studentDto } = dto;
      let finalParentId = existingStudent.parentId;

      // 4. 부모 정보 처리
      if (parentId) {
        // parentId가 제공된 경우 - 기존 부모 직접 참조로 변경
        const existingParent = await manager.findOne(Parent, {
          where: { id: parentId },
        });
        if (!existingParent) {
          throw new NotFoundException('Parent not found');
        }
        finalParentId = parentId;
      } else if (parentDto) {
        if (parentDto.id) {
          // parent.id가 있으면 해당 부모 정보 업데이트
          const existingParent = await manager.findOne(Parent, {
            where: { id: parentDto.id },
          });
          if (!existingParent) {
            throw new NotFoundException('Parent not found');
          }
          // 기존 부모 정보 업데이트
          const updatedParent = manager.merge(Parent, existingParent, {
            name: parentDto.name,
            phone: normalizePhone(parentDto.phone),
            note: parentDto.note,
            termsAgreedAt: parentDto.termsAgreedAt,
          });
          await manager.save(Parent, updatedParent);
          finalParentId = parentDto.id;
        } else {
          // parent.id가 없으면 현재 연결된 부모의 정보를 업데이트
          if (existingStudent.parentId) {
            const currentParent = await manager.findOne(Parent, {
              where: { id: existingStudent.parentId },
            });
            if (!currentParent) {
              throw new NotFoundException('Current parent not found');
            }

            // 현재 부모 정보 업데이트
            const updatedParent = manager.merge(Parent, currentParent, {
              name: parentDto.name,
              phone: normalizePhone(parentDto.phone),
              note: parentDto.note,
              termsAgreedAt: parentDto.termsAgreedAt,
            });
            await manager.save(Parent, updatedParent);
            finalParentId = existingStudent.parentId;
          } else {
            // 현재 연결된 부모가 없으면 새로운 부모 생성
            const newParent = manager.create(Parent, {
              name: parentDto.name,
              phone: normalizePhone(parentDto.phone),
              note: parentDto.note,
              termsAgreedAt: parentDto.termsAgreedAt,
            });
            const savedParent = await manager.save(Parent, newParent);
            finalParentId = savedParent.id;
          }
        }
      }

      // 4.5. Student 데이터 정리
      const normalizedStudentDto = {
        ...studentDto,
        ...(studentDto.phone && { phone: normalizePhone(studentDto.phone) }),
        ...(studentDto.escortPhone && {
          escortPhone: normalizePhone(studentDto.escortPhone),
        }),
      };

      // 5. 학생 정보 업데이트
      const updatedStudent = manager.merge(Student, existingStudent, {
        ...normalizedStudentDto,
        parentId: finalParentId,
      });
      const savedStudent = await manager.save(Student, updatedStudent);

      // 6. 업데이트된 학생 정보 반환 (관계 포함)
      return await manager.findOneOrFail(Student, {
        where: { id: savedStudent.id },
        relations: ['parent'],
      });
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

  //? 학생 이미지 삭제
  async deleteImages(url: string): Promise<void> {
    const fileName = url.split('/').pop();
    if (fileName) {
      await this.s3Service.delete(fileName);
    }
  }
}
