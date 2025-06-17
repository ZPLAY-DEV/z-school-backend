import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { makeOfferingsFromLessons } from 'src/helpers/offering.util';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermOfferingService {
  private readonly logger = new Logger(SchoolTermOfferingService.name);

  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(schoolId: number, termId: number): Promise<Offering[]> {
    const lessons = await this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.groups', 'group')
      .andWhere('lesson.termId = :termId', { termId })
      .orderBy('lesson.id', 'ASC')
      .getMany();

    const offerings = makeOfferingsFromLessons(termId, schoolId, lessons);

    // 기존 offerings 조회 (unique constraint 기준)
    const existingOfferings = await this.offeringRepository.find({
      where: { schoolId, termId },
    });

    // 기존 offerings와 새로운 offerings를 매핑하여 ID 설정
    const offeringsToUpsert = offerings.map((newOffering) => {
      const existing = existingOfferings.find(
        (existing) =>
          existing.schoolId === newOffering.schoolId &&
          existing.termId === newOffering.termId &&
          existing.lessonId === newOffering.lessonId &&
          existing.groupName === newOffering.groupName,
      );

      // 기존 offering이 있으면 ID를 설정하여 update가 되도록 함
      if (existing) {
        return { ...newOffering, id: existing.id };
      }

      // 새로운 offering이면 ID 없이 반환 (insert가 됨)
      return newOffering;
    });

    // upsert: 복합 유니크 키 기준으로 insert or update
    await this.offeringRepository.upsert(offeringsToUpsert, [
      'schoolId',
      'termId',
      'lessonId',
      'groupName',
    ]);

    // 실제 저장된 offerings를 다시 조회해서 반환
    return await this.offeringRepository.find({
      where: { schoolId, termId },
      order: { id: 'ASC' },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async infiniteList(
    schoolId: number,
    termId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Offering>> {
    const queryBuilder = this.offeringRepository
      .createQueryBuilder('offering')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId });

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'lessonName', 'groupName'],
      searchableColumns: ['lessonName', 'groupName'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        pickRule: [FilterOperator.EQ, FilterOperator.IN],
        allowedGrades: [FilterOperator.EQ, FilterOperator.IN],
      },
    });
  }

  async list(
    schoolId: number,
    termId: number,
    grade: string | null = null,
  ): Promise<Offering[]> {
    const items = await this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.picks', 'picks')
      .leftJoinAndSelect('offering.bookings', 'bookings')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .orderBy('offering.id', 'DESC')
      .getMany();
    if (grade) {
      return items.filter((item: Offering) =>
        item.allowedGrades.includes(+grade),
      );
    }

    return items;
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
  async deleteAll(schoolId: number, termId: number): Promise<number> {
    try {
      const result = await this.offeringRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const result = await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from(Offering)
            .where('schoolId = :schoolId AND termId = :termId', {
              schoolId,
              termId,
            })
            .execute();

          return result.affected;
        },
      );

      return result || 0;
    } catch (error) {
      this.logger?.error(error);
      throw new BadRequestException(
        `Processing condition not met: ${error.message}`,
      );
    }
  }
}
