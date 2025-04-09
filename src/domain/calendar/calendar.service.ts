import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  PaginateQuery,
  Paginated,
  paginate,
} from 'nestjs-paginate';
import { UpdateCalendarDto } from 'src/domain/calendar/dto/update-calendar.dto';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { NeisService } from 'src/services/neis/neis-service';
import { Repository } from 'typeorm';
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
    private readonly neisService: NeisService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(): Promise<any> {
    const school = await this.schoolRepository.findOne({
      where: { id: 1 },
    });
    if (!school) {
      return;
    }
    // const calendar = this.calendarRepository.create(dto);
    // return await this.calendarRepository.save(calendar);
  }

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

  async findById(id: number, relations: string[] = []): Promise<Calendar> {
    try {
      return relations.length > 0
        ? await this.calendarRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.calendarRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException('entity not found');
    }
  }

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

  // note that this is hard-delete
  async remove(id: number): Promise<Calendar> {
    const calendar = await this.findById(id);
    return await this.calendarRepository.remove(calendar);
  }
}
