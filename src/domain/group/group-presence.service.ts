import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { CreatePresenceDto } from 'src/domain/presence/dto/create-presence.dto';
import { Presence } from 'src/domain/presence/entities/presence.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GroupPresenceService {
  private readonly logger = new Logger(GroupPresenceService.name);

  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    @InjectRepository(Departure)
    private readonly departureRepository: Repository<Departure>,
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create 또는 Update
  //? ---------------------------------------------------------------------- ?//

  async upsert(
    dto: CreatePresenceDto & { studentId: number },
  ): Promise<Presence> {
    const { groupId, studentId, week, lessonDate, status, note } = dto;

    if (!groupId || !studentId) {
      throw new BadRequestException('groupId와 studentId는 필수입니다.');
    }

    if (!Number.isInteger(week) || week < 1) {
      throw new BadRequestException('주차는 1 이상의 정수여야 합니다.');
    }

    let pick: Pick;
    try {
      pick = await this.pickRepository.findOneOrFail({
        where: { groupId, studentId },
      });
    } catch (error) {
      this.logger.warn(
        `Pick not found for groupId=${groupId}, studentId=${studentId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new NotFoundException('해당 반에서 학생을 찾을 수 없습니다.');
    }

    const payload: Partial<Presence> = {
      pickId: pick.id,
      week,
      lessonDate: typeof lessonDate === 'string' ? lessonDate : null,
      status,
      note: typeof note === 'string' ? note : null,
    };

    const presence =
      (await this.presenceRepository.findOne({
        where: { pickId: pick.id, week },
      })) ?? this.presenceRepository.create(payload);

    Object.assign(presence, payload);

    return await this.presenceRepository.save(presence);
  }

  async findByWeek(
    groupId: number,
    week: number,
    studentId?: number,
  ): Promise<Presence[]> {
    if (!Number.isInteger(week) || week < 1) {
      throw new BadRequestException('주차는 1 이상의 정수여야 합니다.');
    }

    const query = this.presenceRepository
      .createQueryBuilder('presence')
      .innerJoinAndSelect('presence.pick', 'pick')
      .leftJoinAndSelect('pick.student', 'student')
      .where('pick.groupId = :groupId', { groupId })
      .andWhere('presence.week = :week', { week });

    if (typeof studentId === 'number') {
      query.andWhere('pick.studentId = :studentId', { studentId });
    }

    return await query.orderBy('pick.id', 'ASC').getMany();
  }
}
