import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateInstructorDto } from 'src/domain/instructor/dto/create-instructor.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { InstructorSchool } from '../instructor/entities/instructor-school.entity';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { FilterOperator, paginate } from 'nestjs-paginate';
import { Paginated, PaginateQuery } from 'nestjs-paginate';
import { DeleteInstructorSchoolDto } from '../instructor/dto/delete-instructor-school.dto';
import { Document } from 'src/domain/document/entities/document.entity';
@Injectable()
export class SchoolInstructorService {
  private readonly logger = new Logger(SchoolInstructorService.name);

  constructor(
    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
    @InjectRepository(InstructorSchool)
    private instructorSchoolRepository: Repository<InstructorSchool>,
    private dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//
  async create(
    schoolId: number,
    dto: CreateInstructorDto,
  ): Promise<Instructor> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: schoolId },
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
        instructor = this.instructorRepository.create({
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
        .where('instructorSchool.schoolId = :schoolId', { schoolId })
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
        instructorSchool = this.instructorSchoolRepository.create({
          instructorId: instructor.id,
          schoolId,
          alias: dto.name,
          editFeePermission: dto.editFeePermission,
          editEnrollmentPermission: dto.editEnrollmentPermission,
          note: dto.note,
        });
        await manager.save(InstructorSchool, instructorSchool);
      }

      return await manager.findOneOrFail(Instructor, {
        where: { id: instructor.id, instructorSchools: { schoolId } },
        relations: ['instructorSchools'],
      });
    });
  }

  async createBulk(
    schoolId: number,
    dtos: CreateInstructorDto[],
  ): Promise<Instructor[]> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: schoolId },
      });

      if (!school) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
      }

      // 2. phone 기반 기존 강사 Entity 조회
      const phoneNumbers = dtos.map((dto) => dto.phone);

      const existingInstructors = await manager.find(Instructor, {
        where: { phone: In(phoneNumbers) },
      });

      const instructorMap = new Map<string, Instructor>(
        existingInstructors.map((instructor) => [instructor.phone, instructor]),
      );

      // 3. 기존 InstructorSchool 관계 조회
      const existingInstructorSchools = await manager
        .createQueryBuilder(InstructorSchool, 'instructorSchool')
        .innerJoin('instructorSchool.instructor', 'instructor')
        .where('instructorSchool.schoolId = :schoolId', { schoolId })
        .andWhere('instructor.phone IN (:...phones)', { phones: phoneNumbers })
        .getMany();

      const instructorSchoolMap = new Map<string, InstructorSchool>(
        existingInstructorSchools.map((is) => [
          `${is.instructorId}-${is.schoolId}`,
          is,
        ]),
      );
      // 4. 병렬로 일괄 Upsert
      const instructorPromises = dtos.map(async (dto) => {
        try {
          // 4.1. 강사 upsert
          let instructor = instructorMap.get(dto.phone);
          if (instructor) {
            // 기존 강사 업데이트
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
          } else {
            // 새 강사 생성
            instructor = this.instructorRepository.create({
              userId: dto.userId,
              name: dto.name,
              phone: dto.phone,
              pushToken: dto.pushToken,
              termsAgreedAt: dto.termsAgreedAt,
              score: dto.score,
            });
            instructor = await manager.save(Instructor, instructor);
          }

          // 4.2. InstructorSchool 관계 upsert
          const instructorSchoolKey = `${instructor.id}-${schoolId}`;
          let instructorSchool = instructorSchoolMap.get(instructorSchoolKey);

          if (instructorSchool) {
            // 기존 관계 업데이트
            await manager.update(
              InstructorSchool,
              { id: instructorSchool.id },
              {
                instructorId: instructor.id,
                alias: dto.name,
                editFeePermission: dto.editFeePermission,
                editEnrollmentPermission: dto.editEnrollmentPermission,
                note: dto.note,
              },
            );

            // 업데이트된 InstructorSchool 조회
            instructorSchool = await manager.findOneOrFail(InstructorSchool, {
              where: { id: instructorSchool.id },
            });
          } else {
            // 새 관계 생성
            instructorSchool = this.instructorSchoolRepository.create({
              instructorId: instructor.id,
              schoolId,
              alias: dto.name,
              editFeePermission: dto.editFeePermission ?? false,
              editEnrollmentPermission: dto.editEnrollmentPermission ?? false,
              note: dto.note,
            });
            instructorSchool = await manager.save(
              InstructorSchool,
              instructorSchool,
            );
          }

          return await manager.findOneOrFail(Instructor, {
            where: { id: instructor.id, instructorSchools: { schoolId } },
            relations: ['instructorSchools'],
          });
        } catch (error) {
          this.logger.error(
            `Failed to process instructor with phone: ${dto.phone}`,
            error.stack,
          );
          throw error;
        }
      });
      return await Promise.all(instructorPromises);
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number): Promise<Instructor[]> {
    return await this.instructorRepository.find({
      where: { instructorSchools: { schoolId } },
      relations: ['instructorSchools', 'groups'],
      order: {
        instructorSchools: {
          alias: 'ASC',
        },
      },
    });
  }

  async infiniteList(
    schoolId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Instructor>> {
    try {
      return await paginate<Instructor>(query, this.instructorRepository, {
        relations: ['instructorSchools', 'groups'],
        where: {
          instructorSchools: {
            schoolId: schoolId,
          },
        },
        sortableColumns: ['instructorSchools.alias'],
        searchableColumns: ['instructorSchools.alias', 'phone'],
        defaultSortBy: [['instructorSchools.alias', 'ASC']],
        filterableColumns: {
          'instructor.pushToken': [FilterOperator.EQ],
          'instructorSchools.editFeePermission': [FilterOperator.EQ],
          'instructorSchools.editEnrollmentPermission': [FilterOperator.EQ],
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch instructors for school ${schoolId}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDocuments(
    schoolId: number,
    instructorId: number,
  ): Promise<Document[]> {
    try {
      return await this.dataSource
        .createQueryBuilder(Document, 'document')
        .where('document.instructorId = :instructorId', { instructorId })
        .andWhere('document.schoolId = :schoolId', { schoolId })
        .getMany();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//
  async softDelete(
    schoolId: number,
    instructorId: number,
    dto: DeleteInstructorSchoolDto,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      const instructorSchool = await manager.findOne(InstructorSchool, {
        where: { schoolId, instructorId },
      });
      if (!instructorSchool) {
        throw new NotFoundException(
          HttpErrorConstants.NOT_FOUND_INSTRUCTOR_SCHOOL,
        );
      }
      // note ( 사유 ) 업데이트
      await manager.update(
        InstructorSchool,
        { id: instructorSchool.id },
        { note: dto.note },
      );
      // soft Delete
      await manager.softDelete(InstructorSchool, { id: instructorSchool.id });
    });
  }
}
