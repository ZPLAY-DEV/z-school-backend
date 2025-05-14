import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { EnrollmentRule } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  compressRangeFormat,
  getBitmasks,
  getSortedWeekdays,
} from 'src/helpers/parse';
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

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  async create(schoolId: number, termId: number): Promise<Offering[]> {
    const lessons = await this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.groups', 'group')
      .andWhere('lesson.termId = :termId', { termId })
      .orderBy('lesson.id', 'ASC')
      .getMany();

    const offerings: Offering[] = [];
    const uniqueCombinations = new Set<string>();

    for (const lesson of lessons) {
      for (const group of lesson.groups) {
        // Create ITimeRange object
        const timeRange: ITimeRange = {
          weekday: group.weekday,
          start: group.start,
          end: group.end,
        };

        // 반에 대한 고유키 관리
        const uniqueKey = `${lesson.id}-${group.allowedGrades}`;
        if (uniqueCombinations.has(uniqueKey)) {
          const existingOffering = offerings.find(
            (o) =>
              o.lessonName === (lesson.lessonName || `과목 #${lesson.id}`) &&
              o.allowedGrades.join(',') === group.allowedGrades,
          );
          if (existingOffering) {
            existingOffering.times.push(timeRange);
          }
          continue;
        }
        uniqueCombinations.add(uniqueKey);

        const offering = new Offering({
          schoolId,
          termId,
          schoolName: lesson.schoolName || `학교 #${lesson.schoolId}`,
          lessonName: lesson.lessonName || `과목 #${lesson.id}`,
          groupName: group.groupName || `반 #${group.id}`,
          capacity: group.capacity,
          times: [timeRange],
          allowedGrades: group.allowedGrades.split(',').map(Number),
          bitmasks: [],
          formerStudentIds: [],
          enrollmentRule: EnrollmentRule.FIRST,
          allowTimeOverlap: false,
        });

        offerings.push(offering);
      }
    }

    // 3. bitmasks 를 정확하게 update
    for (const offering of offerings) {
      const bitmasks: number[] = [];
      for (const time of offering.times) {
        const slots = getBitmasks(time);
        bitmasks.push(...slots);
      }
      offering.bitmasks = Array.from(new Set(bitmasks)).sort((a, b) => a - b);
    }

    // 4. groupName 을 정확하게 update
    for (const offering of offerings) {
      const weekdayz = getSortedWeekdays(
        [...offering.times].map((v) => v.weekday),
      );
      const gradez = compressRangeFormat(offering.allowedGrades.join(','));
      offering.groupName = `${offering.lessonName} ${weekdayz}반 (${gradez}학년)`;
    }

    // 5. Save to database and return results
    return await this.offeringRepository.save(offerings);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

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

  async list(schoolId: number, termId: number): Promise<Offering[]> {
    return await this.offeringRepository
      .createQueryBuilder('offering')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .orderBy('offering.id', 'DESC')
      .getMany();
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//
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
