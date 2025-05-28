import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import {
  FilterOperator,
  PaginateQuery,
  Paginated,
  paginate,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { School } from 'src/domain/school/entities/school.entity';
import { UpdateSchooldayDto } from 'src/domain/schoolday/dto/update-schoolday.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
@Injectable()
export class SchooldayService {
  private readonly logger = new Logger(SchooldayService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(): Promise<any> {
    const schoolId = 1;
    const termId = 1;
    const startsAt = new Date('2025-04-26');
    const endsAt = addDays(startsAt, 1);
    console.log(`startsAt =`, startsAt);
    console.log(`endsAt =`, endsAt);

    console.log(`schoolId =`, schoolId);
    console.log(`termId =`, termId);
    console.log(`startsAt =`, startsAt);
    console.log(`endsAt =`, endsAt);

    const schooldays = await this.schooldayRepository.find({
      where: {
        schoolId,
        termId,
        startsAt: MoreThanOrEqual(startsAt),
        endsAt: LessThanOrEqual(endsAt),
      },
      relations: {
        group: {
          groupStudents: {
            student: true,
          },
        },
      },
    });

    return schooldays;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(): Promise<Schoolday[]> {
    const queryBuilder = this.schooldayRepository
      .createQueryBuilder('schoolday')
      .leftJoinAndSelect('schoolday.group', 'group')
      .leftJoinAndSelect('group.groupStudents', 'groupStudents');

    return await queryBuilder.getMany();
  }

  async infiniteList(query: PaginateQuery): Promise<Paginated<Schoolday>> {
    const queryBuilder =
      this.schooldayRepository.createQueryBuilder('schoolday');

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        code: [FilterOperator.EQ],
      },
    });
  }

  async findById(id: number, relations: string[] = []): Promise<Schoolday> {
    try {
      return relations.length > 0
        ? await this.schooldayRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.schooldayRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  // 현재 수업일 변경만 지원한다. 변경할 수업일 validation 은 수행하지 않는다.
  // 즉, 새로운 수업시간에 해당 수업의 진행이 정말 가능한지 검사하거나 확인하지 않는다.
  // 수업일이 변경되면, 다이나모 출석부도 수정해야 되므로, subscriber 를 사용했다.
  async update(id: number, dto: UpdateSchooldayDto): Promise<Schoolday> {
    const schoolday = await this.schooldayRepository.preload({ id, ...dto });
    if (!schoolday) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.schooldayRepository.save(schoolday);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  // note that this is hard-delete
  async remove(id: number): Promise<Schoolday> {
    const schoolday = await this.findById(id);
    return await this.schooldayRepository.remove(schoolday);
  }
}
