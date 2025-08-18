import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { getKoreanWeekday } from 'src/helpers/date';
import { NeisService } from 'src/services/neis/neis.service';
import { DataSource, Repository } from 'typeorm';

//? neis API 계정 정보)
//? 아래 notion 페이지 참고
//? https://www.notion.so/dc201a905728469c9ba3017cff2845be
@Injectable()
export class SchoolCalendarService {
  private readonly logger = new Logger(SchoolCalendarService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
    private dataSource: DataSource, // for transaction
    private readonly neisService: NeisService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async createAll(): Promise<number> {
    const schools = await this.schoolRepository.find();
    for (const school of schools) {
      await this.create(school.id);
    }
    return schools.length;
  }

  async create(schoolId: number): Promise<number> {
    const school = await this.schoolRepository.findOne({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const dtos = await this.neisService.getCalendar({
      authorityCode: school.authorityCode,
      schoolCode: school.schoolCode,
      schoolId: schoolId,
    });

    // 데이터가 없으면 0 반환
    if (!dtos || dtos.length === 0) {
      this.logger.warn(`No calendar data found for school ${schoolId}`);
      return 0;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // MySQL 8.0+ 새로운 alias 문법 사용 (bulk insert)
      const placeholders = dtos.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values = dtos.flatMap((dto) => [
        dto.schoolId,
        dto.date || null,
        dto.name || null,
        getKoreanWeekday(dto.date),
        dto.status || null,
        dto.note || null,
      ]);

      const insertQuery = `
        INSERT INTO calendars (schoolId, date, name, weekday, status, note)
        VALUES ${placeholders} AS new_calendar(schoolId, date, name, weekday, status, note)
        ON DUPLICATE KEY UPDATE 
          name = new_calendar.name,
          weekday = new_calendar.weekday,
          status = new_calendar.status,
          note = new_calendar.note
      `;

      await queryRunner.query(insertQuery, values);

      await queryRunner.commitTransaction();
      return dtos.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Calendar creation failed for school ${schoolId}:`,
        error,
      );
      throw error;
    } finally {
      // queryRunner가 release 되었는지 확인
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number): Promise<Calendar[]> {
    const queryBuilder = this.calendarRepository
      .createQueryBuilder('calendar')
      .where('calendar.schoolId = :schoolId', { schoolId })
      .orderBy('calendar.id', 'DESC');

    return await queryBuilder.getMany();
  }

  async infiniteList(
    schoolId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Calendar>> {
    console.log(`🔥🔥🔥🔥 `, query);

    const queryBuilder = this.calendarRepository
      .createQueryBuilder('calendar')
      .where('calendar.schoolId = :schoolId', { schoolId });

    return await paginate<Calendar>(query, queryBuilder, {
      relations: {
        school: true,
      },
      sortableColumns: ['id', 'date'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        date: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
        status: [FilterOperator.EQ, FilterOperator.IN],
        note: [FilterOperator.EQ, FilterOperator.ILIKE, FilterOperator.NULL],
      },
    });
  }
}
