import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { DataSource, Repository } from 'typeorm';
@Injectable()
export class SchoolSamService {
  private readonly logger = new Logger(SchoolSamService.name);

  constructor(
    @InjectRepository(Sam)
    private samRepository: Repository<Sam>,
    private dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async createBulk(
    schoolId: number,
    dtos: CreateSamDto[],
    dryrun: boolean = false, // 덮어쓰진 않고, 덮어쓰여질 레코드 목록만 반환
  ): Promise<Sam[]> {
    if (dryrun) {
      return await this.checkExistingSams(dtos, schoolId);
    }

    if (!dtos.length) {
      return [];
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 학교 존재 여부 확인
      const school = await queryRunner.manager.findOne(School, {
        where: { id: schoolId },
      });

      if (!school) {
        throw new NotFoundException(`School not found`);
      }

      // 2. 강사 일괄 Upsert (MySQL 8.0+ alias 문법 사용)
      const instructors = dtos.map((dto) => dto.instructor);

      if (instructors.length > 0) {
        const instructorPlaceholders = instructors
          .map(() => '(?, ?, ?, ?)')
          .join(', ');
        const instructorValues: (string | number | Date | null)[] =
          instructors.flatMap((instructor) => [
            instructor.userId || null,
            instructor.name || null,
            instructor.phone || null,
            instructor.termsAgreedAt || null,
          ]);

        await queryRunner.query(
          `
          INSERT INTO instructors (userId, name, phone, termsAgreedAt)
          VALUES ${instructorPlaceholders} AS new_instructor(userId, name, phone, termsAgreedAt)
          ON DUPLICATE KEY UPDATE 
            userId = new_instructor.userId,
            termsAgreedAt = new_instructor.termsAgreedAt
          `,
          instructorValues,
        );
      }

      // 3. 강사 ID 조회
      const phoneNumbers = instructors.map((i) => `'${i.phone}'`).join(',');
      const instructorRecords = (await queryRunner.query(`
        SELECT phone, id FROM instructors WHERE phone IN (${phoneNumbers})
      `)) as Array<{ phone: string; id: number }>;

      const instructorMap = Object.fromEntries(
        instructorRecords.map((v) => [v.phone, v.id] as [string, number]),
      );

      // 4. Sam 일괄 Upsert (MySQL 8.0+ alias 문법 사용)
      if (dtos.length > 0) {
        const samPlaceholders = dtos
          .map(() => '(?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const samValues: (string | number | boolean | null)[] = dtos.flatMap(
          (dto) => [
            instructorMap[dto.instructor.phone!] || null,
            schoolId,
            dto.alias || null,
            dto.editFeePermission ?? false,
            dto.editPickPermission ?? false,
            dto.note || null,
            dto.score ?? 0,
          ],
        );

        await queryRunner.query(
          `
          INSERT INTO sams (
            instructorId,
            schoolId,
            alias,
            editFeePermission,
            editPickPermission,
            note,
            score
          )
          VALUES ${samPlaceholders} AS new_sam(
            instructorId,
            schoolId,
            alias,
            editFeePermission,
            editPickPermission,
            note,
            score
          )
          ON DUPLICATE KEY UPDATE 
            alias = new_sam.alias,
            editFeePermission = new_sam.editFeePermission,
            editPickPermission = new_sam.editPickPermission,
            note = new_sam.note,
            score = new_sam.score
          `,
          samValues,
        );
      }

      await queryRunner.commitTransaction();

      // 5. 생성된 Sam 조회 및 반환
      const createdSams = await this.samRepository.find({
        where: { schoolId },
        relations: ['instructor'],
      });

      return createdSams.filter((sam) =>
        dtos.some((dto) => dto.instructor.phone === sam.instructor.phone),
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create bulk sams for school ${schoolId}`,
        error.stack,
      );
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
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
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number): Promise<Sam[]> {
    return await this.samRepository.find({
      where: { schoolId },
      relations: [
        'instructor',
        'contracts',
        'contracts.lesson',
        'contracts.group',
      ],
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
        contracts: {
          group: true,
          lesson: true,
        },
      },
      sortableColumns: ['alias'],
      searchableColumns: ['alias', 'instructor.phone'],
      defaultSortBy: [['id', 'ASC']],
      filterableColumns: {
        alias: [FilterOperator.EQ, FilterOperator.ILIKE],
        'instructor.phone': [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }
}
