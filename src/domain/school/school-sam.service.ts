import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { normalizePhone } from 'src/helpers/phone';
import { DataSource, QueryRunner, Repository } from 'typeorm';
@Injectable()
export class SchoolSamService {
  private readonly logger = new Logger(SchoolSamService.name);

  constructor(
    @InjectRepository(Sam)
    private samRepository: Repository<Sam>,
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
    private dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async createBulkDryrun(
    schoolId: number,
    dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    return await this.checkExistingSams(schoolId, dtos);
  }

  async createBulk(schoolId: number, dtos: CreateSamDto[]): Promise<number> {
    if (!dtos.length) {
      return 0;
    }

    // DTO 레벨에서 전화번호 정규화 (한 번만 처리)
    const normalizedDtos = dtos.map((dto) => {
      return {
        ...dto,
        instructor: {
          ...dto.instructor,
          phone: normalizePhone(dto.instructor.phone),
        },
      };
    });

    // 3. 학교 존재 여부 확인
    const school = await this.schoolRepository.findOne({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException(`School not found: ${schoolId}`);
    }

    // 4. 트랜잭션 시작
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      this.logger.log(`Transaction started for school ${schoolId}`);

      // 5. 강사 처리 및 매핑
      const instructorMap = await this.processInstructors(
        queryRunner,
        normalizedDtos,
      );
      this.logger.log(
        `Processed ${instructorMap.size} instructors for school ${schoolId}`,
      );

      // 6. 기존 Sam 레코드 조회 (삭제 대상 식별용) - 현재는 사용하지 않지만 향후 확장성을 위해 유지
      // await this.getExistingSams(queryRunner, schoolId, instructorMap);

      // 7. Sam 일괄 Upsert
      await this.upsertSams(
        queryRunner,
        normalizedDtos,
        schoolId,
        instructorMap,
      );
      this.logger.log(
        `Upserted ${normalizedDtos.length} sams for school ${schoolId}`,
      );

      // 8. 요청에 포함되지 않은 기존 Sam 레코드 삭제 (죽은 데이터 정리)
      await this.cleanupOrphanedSams(
        queryRunner,
        schoolId,
        normalizedDtos,
        instructorMap,
      );

      // 9. 트랜잭션 커밋
      await queryRunner.commitTransaction();

      // const createdSams = await this.samRepository
      //   .createQueryBuilder('sam')
      //   .leftJoinAndSelect('sam.instructor', 'instructor')
      //   .where('sam.schoolId = :schoolId', { schoolId })
      //   .andWhere('sam.instructorId IN (:...instructorIds)', {
      //     instructorIds: requestedInstructorIds,
      //   })
      //   .orderBy('sam.alias', 'ASC')
      //   .getMany();

      return normalizedDtos.length;
    } catch (error) {
      // 트랜잭션이 활성 상태인 경우에만 롤백
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
        this.logger.log(`Transaction rolled back for school ${schoolId}`);
      }
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
    schoolId: number,
    dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    const phoneNumbers = dtos
      .map((dto) => dto.instructor?.phone)
      .filter(Boolean);

    if (phoneNumbers.length === 0) {
      return [];
    }

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

  /**
   * 강사 정보를 처리하고 ID 매핑 (phone -> id)을 반환
   * - instructor.id 포함시: 기존 instructor 찾아서 정보 수정
   * - instructor.id 미포함시: phone으로 instructor 검색
   *   - 기존 instructor 발견시: 해당 instructor 정보 수정
   *   - 기존 instructor 미발견시: 새로운 instructor 생성
   */
  private async processInstructors(
    queryRunner: QueryRunner,
    dtos: CreateSamDto[],
  ): Promise<Map<string, number>> {
    const instructorMap = new Map<string, number>();
    const instructorsToUpsert: Array<{
      id?: number;
      userId?: number | null;
      name: string | null;
      phone: string;
      note?: string | null;
      termsAgreedAt?: Date | null;
    }> = [];

    // 1단계: 각 DTO의 instructor 처리 로직 적용
    for (const dto of dtos) {
      const { instructor } = dto;

      if (instructor.id) {
        // instructor.id가 포함된 경우: 기존 instructor 찾아서 정보 수정
        const existingInstructor = await queryRunner.query(
          'SELECT id, phone FROM instructors WHERE id = ?',
          [instructor.id],
        );

        if (existingInstructor.length === 0) {
          throw new NotFoundException(
            `Instructor not found with id: ${instructor.id}`,
          );
        }

        const existingPhone = existingInstructor[0].phone as string;
        instructorMap.set(existingPhone, instructor.id);

        // 기존 instructor 정보 업데이트
        instructorsToUpsert.push({
          id: instructor.id,
          userId: instructor.userId || null,
          name: instructor.name || null,
          phone: existingPhone,
          note: instructor.note || null,
          termsAgreedAt: instructor.termsAgreedAt || null,
        });
      } else {
        // instructor.id가 없는 경우: phone으로 처리
        if (!instructor.phone) {
          throw new BadRequestException(
            'Phone number is required when instructor.id is not provided',
          );
        }

        // phone으로 기존 instructor 검색 (이미 정규화된 전화번호 사용)
        const existingInstructor = await queryRunner.query(
          'SELECT id, phone FROM instructors WHERE phone = ?',
          [instructor.phone],
        );

        if (existingInstructor.length > 0) {
          // 기존 instructor 발견: 정보 수정
          const existingId = existingInstructor[0].id as number;
          instructorMap.set(instructor.phone, existingId);

          instructorsToUpsert.push({
            id: existingId,
            userId: instructor.userId || null,
            name: instructor.name || null,
            phone: instructor.phone,
            note: instructor.note || null,
            termsAgreedAt: instructor.termsAgreedAt || null,
          });
        } else {
          // 기존 instructor 미발견: 새로운 instructor 생성
          instructorsToUpsert.push({
            userId: instructor.userId || null,
            name: instructor.name || null,
            phone: instructor.phone,
            note: instructor.note || null,
            termsAgreedAt: instructor.termsAgreedAt || null,
          });
          // 새로운 instructor는 3단계에서 ID를 받아서 매핑에 추가됨
        }
      }
    }

    // 2단계: 강사 일괄 Upsert (MySQL 8.0+ alias 문법 사용)
    if (instructorsToUpsert.length > 0) {
      const instructorPlaceholders = instructorsToUpsert
        .map(() => '(?, ?, ?, ?, ?)')
        .join(', ');

      const instructorValues: (string | number | Date | null)[] =
        instructorsToUpsert.flatMap((instructor) => [
          instructor.userId || null,
          instructor.name || null,
          instructor.phone,
          instructor.note || null,
          instructor.termsAgreedAt || null,
        ]);

      await queryRunner.query(
        `
        INSERT INTO instructors (userId, name, phone, note, termsAgreedAt)
        VALUES ${instructorPlaceholders} AS new_instructor(userId, name, phone, note, termsAgreedAt)
        ON DUPLICATE KEY UPDATE 
          userId = new_instructor.userId,
          name = new_instructor.name,
          note = new_instructor.note,
          termsAgreedAt = new_instructor.termsAgreedAt
        `,
        instructorValues,
      );
    }

    // 3단계: 최종 instructor ID 매핑 조회
    const phoneNumbers = Array.from(
      new Set(instructorsToUpsert.map((i) => i.phone)),
    );

    this.logger.log(
      `Processing ${phoneNumbers.length} unique phone numbers: ${phoneNumbers.join(', ')}`,
    );

    if (phoneNumbers.length > 0) {
      const placeholders = phoneNumbers.map(() => '?').join(',');
      const instructorRecords = (await queryRunner.query(
        `SELECT phone, id FROM instructors WHERE phone IN (${placeholders})`,
        phoneNumbers,
      )) as Array<{ phone: string; id: number }>;

      this.logger.log(`Found ${instructorRecords.length} instructor records`);

      // 매핑 업데이트
      instructorRecords.forEach((record) => {
        instructorMap.set(record.phone, record.id);
        this.logger.log(
          `Mapped phone ${record.phone} to instructor ID ${record.id}`,
        );
      });
    }

    this.logger.log(`Final instructorMap size: ${instructorMap.size}`);
    return instructorMap;
  }

  /**
   * 기존 Sam 레코드 조회
   */
  private async getExistingSams(
    queryRunner: QueryRunner,
    schoolId: number,
    instructorMap: Map<string, number>,
  ): Promise<Array<{ id: number; instructorId: number }>> {
    const instructorIds = Array.from(instructorMap.values());

    this.logger.log(
      `getExistingSams: ${instructorIds.length} instructor IDs found`,
    );

    if (instructorIds.length === 0) {
      this.logger.log('No instructor IDs found, returning empty array');
      return [];
    }

    const placeholders = instructorIds.map(() => '?').join(',');
    this.logger.log(`Querying with placeholders: ${placeholders}`);

    return (await queryRunner.query(
      `SELECT id, instructorId FROM sams WHERE schoolId = ? AND instructorId IN (${placeholders})`,
      [schoolId, ...instructorIds],
    )) as Array<{ id: number; instructorId: number }>;
  }

  /**
   * Sam 일괄 Upsert
   */
  private async upsertSams(
    queryRunner: QueryRunner,
    dtos: CreateSamDto[],
    schoolId: number,
    instructorMap: Map<string, number>,
  ): Promise<void> {
    if (dtos.length === 0) {
      return;
    }

    const samPlaceholders = dtos.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');

    const samValues: (string | number | boolean | null)[] = dtos.flatMap(
      (dto) => {
        const instructorId = this.getInstructorId(dto, instructorMap);

        if (!instructorId) {
          throw new BadRequestException(
            `Instructor not found for phone: ${dto.instructor.phone}`,
          );
        }

        return [
          instructorId,
          schoolId,
          dto.alias || null,
          dto.editFeePermission ?? false,
          dto.editPickPermission ?? false,
          dto.note || null,
          dto.score ?? 0,
        ];
      },
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

  /**
   * 요청에 포함되지 않은 기존 Sam 레코드 삭제 (죽은 데이터 정리)
   */
  private async cleanupOrphanedSams(
    queryRunner: QueryRunner,
    schoolId: number,
    dtos: CreateSamDto[],
    instructorMap: Map<string, number>,
  ): Promise<void> {
    const requestedInstructorIds = dtos.map((dto) =>
      this.getInstructorId(dto, instructorMap),
    );
    const validInstructorIds = requestedInstructorIds.filter(
      (id) => id !== null,
    );

    if (validInstructorIds.length === 0) {
      // 모든 Sam 레코드 삭제
      await queryRunner.query('DELETE FROM sams WHERE schoolId = ?', [
        schoolId,
      ]);
    } else {
      // 요청에 포함되지 않은 Sam 레코드만 삭제
      const placeholders = validInstructorIds.map(() => '?').join(',');
      await queryRunner.query(
        `DELETE FROM sams WHERE schoolId = ? AND instructorId NOT IN (${placeholders})`,
        [schoolId, ...validInstructorIds],
      );
    }
  }

  /**
   * DTO에서 instructor ID를 안전하게 추출
   */
  private getInstructorId(
    dto: CreateSamDto,
    instructorMap: Map<string, number>,
  ): number | null {
    if (dto.instructor.id) {
      // instructor.id가 직접 제공된 경우
      return dto.instructor.id;
    } else if (dto.instructor.phone) {
      // phone으로 매핑된 경우 (이미 정규화된 전화번호 사용)
      return instructorMap.get(dto.instructor.phone) || null;
    }
    return null;
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
        alias: 'ASC',
      },
    });
  }

  async infiniteList(
    query: PaginateQuery,
    schoolId: number,
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
      defaultSortBy: [['alias', 'ASC']],
      filterableColumns: {
        alias: [FilterOperator.EQ, FilterOperator.ILIKE],
        'instructor.name': [FilterOperator.EQ, FilterOperator.ILIKE],
        'instructor.phone': [FilterOperator.EQ, FilterOperator.ILIKE],
        'contracts.termId': [FilterOperator.EQ],
      },
    });
  }
}
