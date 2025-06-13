import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { School } from 'src/domain/school/entities/school.entity';
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
    private dataSource: DataSource, // for transaction
    private readonly neisService: NeisService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const queryValues = dtos
        .map((dto) => {
          return `(
          ${dto.schoolId},
          ${dto.date ? `'${dto.date}'` : 'NULL'},
          ${dto.name ? `'${dto.name}'` : 'NULL'},
          ${dto.status ? `'${dto.status}'` : 'NULL'},
          ${dto.note ? `'${dto.note}'` : 'NULL'}
        )`;
        })
        .join(',');

      await queryRunner.query(`
        INSERT INTO calendars (schoolId, date, name, status, note)
        VALUES ${queryValues}
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name),
          status = VALUES(status),
          note = VALUES(note)
      `);

      await queryRunner.commitTransaction();
      return dtos.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      throw error;
    } finally {
      // queryRunner가 release 되었는지 확인
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }
}
