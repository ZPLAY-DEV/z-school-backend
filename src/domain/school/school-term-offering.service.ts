import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
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

    // upsert: 복합 유니크 키 기준으로 insert or update
    await this.offeringRepository.upsert(offerings, [
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
        enrollmentRule: [FilterOperator.EQ, FilterOperator.IN],
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
      throw new BadRequestException(HttpErrorConstants.CONDITION_NOT_MET);
    }
  }
}
