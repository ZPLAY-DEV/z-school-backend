import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSchooldayAttendanceDto } from 'src/domain/schoolday/dto/create-schoolday-attendance.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
@Injectable()
export class SchooldayAttendanceService {
  private readonly logger = new Logger(SchooldayAttendanceService.name);

  constructor(
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSchooldayAttendanceDto): Promise<any> {
    const { schoolId, termId, from, to } = dto;
    const startsAt = new Date(from);
    const endsAt = new Date(to);
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

    console.log(`schooldays =`, schooldays.length);

    return schooldays;
  }
}
