import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Document } from 'src/domain/document/entities/document.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { DeleteSamNoteDto } from 'src/domain/sam/dto/delete-sam-note.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
@Injectable()
export class SchoolSamService {
  private readonly logger = new Logger(SchoolSamService.name);

  constructor(
    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Sam)
    private samRepository: Repository<Sam>,
    private dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSamDto, schoolId: number): Promise<Sam> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: schoolId },
      });
      if (!school) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
      }

      // 2. instructor 존재 여부 확인 (upsert)
      let instructor: Instructor | undefined;

      let instructorId: number | undefined;
      if (dto.instructor) {
        let foundInstructor = await manager.findOne(Instructor, {
          where: { phone: dto.instructor.phone },
        });
        if (!foundInstructor) {
          foundInstructor = manager.create(Instructor, dto.instructor);
          foundInstructor = await manager.save(Instructor, foundInstructor);
        }
        instructor = foundInstructor ?? undefined;
        instructorId = instructor.id;
      } else if (dto.instructorId) {
        instructor =
          (await manager.findOne(Instructor, {
            where: { id: dto.instructorId },
          })) ?? undefined;
        if (!instructor) {
          throw new NotFoundException('Instructor not found');
        }
        instructorId = instructor.id;
      } else {
        throw new NotFoundException('Instructor information is required');
      }

      // 3. Sam 관계 upsert (동일 instructorId + schoolId 기준)
      let sam = await manager.findOne(Sam, {
        where: {
          instructorId: instructorId,
          schoolId: schoolId,
        },
      });

      if (sam) {
        // 기존 관계 업데이트
        manager.merge(Sam, sam, {
          alias: dto.alias,
          score: dto.score,
          editFeePermission: dto.editFeePermission,
          editEnrollmentPermission: dto.editEnrollmentPermission,
          note: dto.note,
        });
        sam = await manager.save(Sam, sam);
      } else {
        // 새 관계 생성
        sam = manager.create(Sam, {
          instructorId: instructorId,
          schoolId: schoolId,
          alias: dto.alias,
          score: dto.score ?? 0,
          editFeePermission: dto.editFeePermission ?? false,
          editEnrollmentPermission: dto.editEnrollmentPermission ?? false,
          note: dto.note,
        });
        sam = await manager.save(Sam, sam);
      }

      return await manager.findOneOrFail(Sam, {
        where: { id: sam.id },
        relations: ['instructor'],
      });
    });
  }

  async createBulk(
    schoolId: number,
    dtos: CreateSamDto[],
    dryrun: boolean = false, // 덮어쓰진 않고, 덮어쓰여질 레코드 목록만 반환
  ): Promise<Sam[]> {
    if (dryrun) {
      return await this.checkExistingSams(dtos, schoolId);
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: schoolId },
      });

      if (!school) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
      }

      // 2. phone 기반 기존 강사 Entity 조회
      const phoneNumbers = dtos.map((dto) => dto.instructor.phone);

      const existingInstructors = await manager.find(Instructor, {
        where: { phone: In(phoneNumbers) },
      });

      const instructorMap = new Map<string, Instructor>(
        existingInstructors.map((instructor) => [instructor.phone, instructor]),
      );

      // 3. 기존 InstructorSchool 관계 조회
      const existingInstructorSchools = await manager
        .createQueryBuilder(Sam, 'sam')
        .innerJoin('sam.instructor', 'instructor')
        .where('sam.schoolId = :schoolId', { schoolId })
        .andWhere('instructor.phone IN (:...phones)', { phones: phoneNumbers })
        .getMany();

      const instructorSchoolMap = new Map<string, Sam>(
        existingInstructorSchools.map((is) => [
          `${is.instructorId}-${is.schoolId}`,
          is,
        ]),
      );

      // 4. 병렬로 일괄 Upsert
      const instructorPromises = dtos.map(async (dto) => {
        try {
          // 4.1. 강사 upsert
          let instructor = instructorMap.get(dto.instructor.phone);
          if (instructor) {
            // 기존 강사 업데이트
            await manager.update(
              Instructor,
              { id: instructor.id },
              {
                userId: dto.instructor.userId,
                pushToken: dto.instructor.pushToken,
                termsAgreedAt: dto.instructor.termsAgreedAt,
              },
            );
          } else {
            // 새 강사 생성
            instructor = manager.create(Instructor, {
              userId: dto.instructor.userId,
              name: dto.instructor.name,
              phone: dto.instructor.phone,
              pushToken: dto.instructor.pushToken,
              termsAgreedAt: dto.instructor.termsAgreedAt,
            });
            instructor = await manager.save(Instructor, instructor);
          }

          // 4.2. sam 관계 upsert
          const samKey = `${instructor.id}-${schoolId}`;
          let sam = instructorSchoolMap.get(samKey);

          if (sam) {
            // 기존 관계 업데이트
            await manager.update(
              Sam,
              { id: sam.id },
              {
                instructorId: instructor.id,
                alias: dto.alias,
                editFeePermission: dto.editFeePermission,
                editEnrollmentPermission: dto.editEnrollmentPermission,
                note: dto.note,
                score: dto.score,
              },
            );

            // 업데이트된 Sam 조회
            sam = await manager.findOneOrFail(Sam, {
              where: { id: sam.id },
            });
          } else {
            // 새 관계 생성
            sam = this.samRepository.create({
              instructorId: instructor.id,
              schoolId,
              alias: dto.alias,
              editFeePermission: dto.editFeePermission ?? false,
              editEnrollmentPermission: dto.editEnrollmentPermission ?? false,
              note: dto.note,
              score: dto.score ?? 0,
            });
            sam = await manager.save(Sam, sam);
          }

          return await manager.findOneOrFail(Sam, {
            where: { id: sam.id },
            relations: ['instructor'],
          });
        } catch (error) {
          this.logger.error(
            `Failed to process instructor with phone: ${dto.instructor.phone}`,
            error.stack,
          );
          throw error;
        }
      });
      return await Promise.all(instructorPromises);
    });
  }

  private async checkExistingSams(
    dtos: CreateSamDto[],
    schoolId: number,
  ): Promise<Sam[]> {
    const phoneNumbers = dtos
      .map((dto) => dto.instructor?.phone)
      .filter(Boolean);
    const existingSams = await this.samRepository
      .createQueryBuilder('sam')
      .innerJoin(Instructor, 'instructor', 'sam.instructorId = instructor.id')
      .where('sam.schoolId = :schoolId', {
        schoolId,
      })
      .andWhere('instructor.phone IN (:...phones)', { phones: phoneNumbers })
      .getMany();
    return existingSams;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number): Promise<Sam[]> {
    return await this.samRepository.find({
      where: { schoolId },
      relations: ['instructor', 'groups'],
      order: {
        id: 'ASC',
      },
    });
  }

  async infiniteList(
    schoolId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Sam>> {
    const queryBuilder = this.samRepository
      .createQueryBuilder('sam')
      .where('sam.schoolId = :schoolId', { schoolId });

    return await paginate<Sam>(query, queryBuilder, {
      relations: {
        instructor: true,
        groups: true,
      },
      sortableColumns: ['alias'],
      searchableColumns: ['alias', 'instructor.phone', 'groups.groupName'],
      defaultSortBy: [['id', 'ASC']],
      filterableColumns: {
        alias: [FilterOperator.EQ, FilterOperator.ILIKE],
        'groups.groupName': [FilterOperator.EQ, FilterOperator.ILIKE],
        'instructor.userId': [FilterOperator.EQ],
        'instructor.phone': [FilterOperator.EQ, FilterOperator.ILIKE],
        editFeePermission: [FilterOperator.EQ],
        editEnrollmentPermission: [FilterOperator.EQ],
      },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//
  async softDelete(
    schoolId: number,
    samId: number,
    dto: DeleteSamNoteDto,
  ): Promise<void> {
    const sam = await this.samRepository.findOneOrFail({
      where: { schoolId, id: samId },
    });
    await this.samRepository.update(sam.id, {
      note: dto.note,
      deletedAt: new Date(),
    });
  }
}
