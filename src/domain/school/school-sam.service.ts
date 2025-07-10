import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
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

  // todo. see if it works
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
        throw new NotFoundException(`School not found`);
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
          let instructor = instructorMap.get(dto.instructor.phone!);
          if (instructor) {
            // 기존 강사 업데이트
            await manager.update(
              Instructor,
              { id: instructor.id },
              {
                userId: dto.instructor.userId,
                termsAgreedAt: dto.instructor.termsAgreedAt,
              },
            );
          } else {
            // 새 강사 생성
            instructor = manager.create(Instructor, {
              userId: dto.instructor.userId,
              name: dto.instructor.name,
              phone: dto.instructor.phone,
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
                editPickPermission: dto.editPickPermission,
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
              editPickPermission: dto.editPickPermission ?? false,
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
            `Failed to process instructor with phone: ${dto.instructor.phone!}`,
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

  async getGroupsForDate(
    schoolId: number,
    samId: number,
    date?: string,
  ): Promise<Group[]> {
    // 1. Sam이 해당 학교에 속하는지 확인하고 관련 Group들을 조회
    const sam = await this.samRepository.findOneOrFail({
      where: { schoolId, id: samId },
      relations: [
        'contracts',
        'contracts.group',
        'contracts.group.lesson',
        'contracts.group.schooldays',
      ],
    });

    if (!sam?.contracts) {
      return [];
    }

    // 2. 주어진 날짜에 수업이 있는 Group들만 필터링
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const groupsWithSchooldays = sam.contracts
      .map((contract) => contract.group)
      .filter((group) => {
        // 해당 날짜에 schoolday가 있는 group들만 선택
        return group.schooldays?.some((schoolday) => {
          const schooldayDate = new Date(schoolday.startsAt);
          return schooldayDate >= startOfDay && schooldayDate <= endOfDay;
        });
      });

    // 3. 수업 시작 시간 기준으로 오름차순 정렬
    return groupsWithSchooldays.sort((a, b) => {
      // 해당 날짜의 첫 번째 schoolday의 시작시간 기준으로 정렬
      const aSchoolday = a.schooldays?.find((sd) => {
        const sdDate = new Date(sd.startsAt);
        return sdDate >= startOfDay && sdDate <= endOfDay;
      });

      const bSchoolday = b.schooldays?.find((sd) => {
        const sdDate = new Date(sd.startsAt);
        return sdDate >= startOfDay && sdDate <= endOfDay;
      });

      if (!aSchoolday || !bSchoolday) {
        return 0;
      }

      return (
        new Date(aSchoolday.startsAt).getTime() -
        new Date(bSchoolday.startsAt).getTime()
      );
    });
  }
}
