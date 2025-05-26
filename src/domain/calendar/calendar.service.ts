import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  PaginateQuery,
  Paginated,
  paginate,
} from 'nestjs-paginate';
import { UpdateCalendarDto } from 'src/domain/calendar/dto/update-calendar.dto';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { Repository } from 'typeorm';
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findAll(query: PaginateQuery): Promise<Paginated<Calendar>> {
    const queryBuilder = this.calendarRepository.createQueryBuilder('calendar');

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        code: [FilterOperator.EQ],
      },
    });
  }

  async findByDateRange(
    schoolId: number,
    startDate: string, // 예: "2025-08-01"
    endDate: string, // 예: "2025-08-31"
  ): Promise<string[]> {
    const dates = await this.calendarRepository
      .createQueryBuilder('calendar')
      .where('calendar.schoolId = :schoolId', { schoolId })
      .andWhere('calendar.date >= :startDate AND calendar.date <= :endDate', {
        startDate,
        endDate,
      })
      .orderBy('calendar.date', 'ASC')
      .getMany();

    return dates.map((calendar) => calendar.date);
  }

  // async findById(id: number, relations: string[] = []): Promise<Calendar> {
  //   try {
  //     return relations.length > 0
  //       ? await this.calendarRepository.findOneOrFail({
  //           where: { id },
  //           relations,
  //         })
  //       : await this.calendarRepository.findOneOrFail({
  //           where: { id },
  //         });
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
  //   }
  // }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateCalendarDto): Promise<Calendar> {
    const calendar = await this.calendarRepository.preload({ id, ...dto });
    if (!calendar) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.calendarRepository.save(calendar);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<Calendar> {
    const calendar = await this.calendarRepository.findOneOrFail({
      where: { id },
    });
    await this.calendarRepository.remove(calendar);
    return calendar;
  }
}
