import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { EnrollmentRule } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateTermDto } from 'src/domain/term/dto/update-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  compressRangeFormat,
  getBitmasks,
  getSortedWeekdays,
} from 'src/helpers/parse';
import { S3Service } from 'src/services/aws/s3.service';
import { Repository } from 'typeorm';

@Injectable()
export class TermService {
  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly s3Service: S3Service,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  async create(dto: CreateTermDto): Promise<Term> {
    const item = this.termRepository.create(dto);
    return await this.termRepository.save(item);
  }

  async createOfferings(termId: number): Promise<Offering[]> {
    const lessons = await this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.groups', 'group')
      .where('lesson.termId = :termId', { termId })
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
          schoolId: lesson.schoolId,
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

  async findAll(query: PaginateQuery): Promise<Paginated<Term>> {
    const queryBuilder = this.termRepository.createQueryBuilder('term');
    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'termName'],
      searchableColumns: ['termName'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        isActive: [FilterOperator.EQ],
        termType: [FilterOperator.EQ],
      },
    });
  }

  async findActive(): Promise<Term[]> {
    return await this.termRepository
      .createQueryBuilder('term')
      .orderBy('term.id', 'DESC')
      .where({ isActive: true })
      .getMany();
  }

  async findById(id: number, relations: string[] = []): Promise<Term> {
    try {
      return relations.length > 0
        ? await this.termRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.termRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException('entity not found');
    }
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  async update(id: number, dto: UpdateTermDto): Promise<Term> {
    const term = await this.termRepository.preload({ id, ...dto });
    if (!term) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.termRepository.save(term);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  // note that this is hard-delete
  async remove(id: number): Promise<Term> {
    const term = await this.findById(id);
    return await this.termRepository.remove(term);
  }
}
