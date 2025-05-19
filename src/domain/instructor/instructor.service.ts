import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Group } from 'src/domain/group/entities/group.entity';
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { School } from '../school/entities/school.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { DeleteInstructorSchoolDto } from './dto/delete-instructor-school.dto';
import { InstructorSchool } from './entities/instructor-school.entity';

@Injectable()
export class InstructorService {
  private readonly logger = new Logger(InstructorService.name);

  constructor(
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//
  async create(dto: CreateInstructorDto): Promise<Instructor> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: dto.schoolId },
      });

      if (!school) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
      }

      // 2. phone으로 강사 조회
      let instructor = await manager.findOne(Instructor, {
        where: { phone: dto.phone },
      });

      // 3. 강사 upsert 처리
      if (instructor) {
        // 기존 강사 정보 업데이트
        await manager.update(
          Instructor,
          { id: instructor.id },
          {
            userId: dto.userId,
            pushToken: dto.pushToken,
            termsAgreedAt: dto.termsAgreedAt,
            score: dto.score ?? instructor.score,
          },
        );

        // 업데이트된 강사 정보 조회
        instructor = await manager.findOneOrFail(Instructor, {
          where: { id: instructor.id },
        });
      } else {
        // 새 강사 생성
        instructor = manager.create(Instructor, {
          userId: dto.userId,
          name: dto.name,
          phone: dto.phone,
          pushToken: dto.pushToken,
          termsAgreedAt: dto.termsAgreedAt,
          score: dto.score,
        });
        instructor = await manager.save(Instructor, instructor);
      }
      // 4. InstructorSchool 관계 upsert (동일 phone 기준)
      let instructorSchool = await manager
        .createQueryBuilder(InstructorSchool, 'instructorSchool')
        .innerJoin('instructorSchool.instructor', 'instructor')
        .where('instructorSchool.schoolId = :schoolId', {
          schoolId: dto.schoolId,
        })
        .andWhere('instructor.phone = :phone', { phone: dto.phone })
        .getOne();

      if (instructorSchool) {
        // 기존 관계 업데이트
        await manager.update(
          InstructorSchool,
          { id: instructorSchool.id },
          {
            instructorId: instructor.id, // phone이 동일하더라도 최신 instructor.id로 업데이트 되도록 처리
            alias: dto.name,
            editFeePermission: dto.editFeePermission,
            editEnrollmentPermission: dto.editEnrollmentPermission,
            note: dto.note,
          },
        );
      } else {
        // 새 관계 생성
        instructorSchool = manager.create(InstructorSchool, {
          instructorId: instructor.id,
          schoolId: dto.schoolId,
          alias: dto.name,
          editFeePermission: dto.editFeePermission,
          editEnrollmentPermission: dto.editEnrollmentPermission,
          note: dto.note,
        });
        await manager.save(InstructorSchool, instructorSchool);
      }

      return await manager.findOneOrFail(Instructor, {
        where: {
          id: instructor.id,
          instructorSchools: { schoolId: dto.schoolId },
        },
        relations: ['instructorSchools'],
      });
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async dryRun(dto: CreateInstructorDto): Promise<Instructor | null> {
    // In dryRun mode, we check if the instructor exists but don't create it

    const existingInstructor = await this.instructorRepository
      .createQueryBuilder('instructor')
      .innerJoin(
        InstructorSchool,
        'instructorSchool',
        'instructorSchool.instructorId = instructor.id',
      )
      .where('instructorSchool.schoolId = :schoolId', {
        schoolId: dto.schoolId,
      })
      .andWhere('instructor.phone = :phone', { phone: dto.phone })
      .getOne();

    return existingInstructor ? existingInstructor : null;
  }

  // name 으로 시작하는 과목을 가리키는 강사 리스트
  async list(name: string | null): Promise<Instructor[]> {
    const queryBuilder = this.instructorRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.schools', 'school')
      .leftJoinAndSelect('instructor.instructorLessons', 'instructorLesson')
      .leftJoinAndSelect('instructorLesson.lesson', 'lesson');

    if (name) {
      queryBuilder.where('instructor.name LIKE :name', { name: `${name}%` });
    }
    queryBuilder.orderBy('instructor.id', 'DESC');

    return await queryBuilder.getMany();
  }

  async infiniteList(query: PaginateQuery): Promise<Paginated<Instructor>> {
    const queryBuilder = this.instructorRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.schools', 'school')
      .leftJoinAndSelect('instructor.instructorLessons', 'instructorLesson')
      .leftJoinAndSelect('instructorLesson.lesson', 'lesson');

    const config: PaginateConfig<Instructor> = {
      sortableColumns: ['id'],
      defaultLimit: 20,
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        userId: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        phone: [FilterOperator.EQ, FilterOperator.ILIKE],
        hashtags: [FilterOperator.EQ, FilterOperator.IN],
        termsAgreedAt: [FilterOperator.NULL],
        'school.name': [FilterOperator.IN],
      },
    };

    return paginate<Instructor>(query, queryBuilder, config);
  }

  async findById(id: number, relations: string[] = []): Promise<Instructor> {
    try {
      return relations.length > 0
        ? await this.instructorRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.instructorRepository.findOneOrFail({
            where: { id },
          });
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  async listGroups(instructorId: number): Promise<Group[]> {
    return this.groupRepository.find({
      where: { instructorId },
      relations: ['lesson'],
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateInstructorDto): Promise<Instructor> {
    const data = {
      id,
      ...dto,
    } as unknown as Instructor;

    const instructor = await this.instructorRepository.preload(data);
    if (!instructor) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.instructorRepository.save(instructor);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async softDeleteSchoolInstructor(
    id: number,
    dto: DeleteInstructorSchoolDto,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      // note ( 사유 ) 업데이트
      await manager.update(InstructorSchool, { id }, { note: dto.note });
      // soft Delete
      await manager.softDelete(InstructorSchool, { id });
    });
  }
  // note that this is hard-delete
  async remove(id: number): Promise<Instructor> {
    try {
      const instructor = await this.findById(id);
      await this.instructorRepository.softRemove(instructor);
      return instructor;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
