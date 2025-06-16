import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { AWS_SQS_CLIENT, REDIS_TRACKING_CLIENT } from 'src/common/constants';
import { SendMode } from 'src/common/enums';
import { IMixedTargetMessage } from 'src/common/interfaces';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { CreateLetterDto } from 'src/domain/letter/dto/create-letter.dto';
import { CreateNanoidDto } from 'src/domain/parent/dto/create-nanoid.dto';
import { chunk } from 'src/helpers/array';
import { parseValidityToDate } from 'src/helpers/time';
import { SqsService } from 'src/services/aws/sqs.service';
import { RedisTrackingService } from 'src/services/redis/redis-tracking.service';
import { DataSource, EntityManager, In } from 'typeorm';
import { NanoId } from '../parent/entities/nanoid.entity';
import { School } from '../school/entities/school.entity';
import { Student } from '../student/entities/student.entity';
import { Term } from '../term/entities/term.entity';
import { Letter } from './entities/letter.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';

@Injectable()
export class LetterService {
  private readonly logger = new Logger(LetterService.name);
  constructor(
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
    @Inject(REDIS_TRACKING_CLIENT)
    private readonly redisTrackingService: RedisTrackingService,
    private readonly dataSource: DataSource,
    // private readonly schedulerService: SchedulerService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  //? 학생 대상 발송
  async create(dto: CreateLetterDto): Promise<Letter> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 유효성 검증
      await this.validateSchool(manager, dto);
      await this.validateTerm(manager, dto);

      // 2. 발송 정보 생성
      const letter = await this.createLetter(manager, dto);

      // 3. 학생 정보 조회
      const students = await this.getStudents(manager, dto.ids);

      // 4. unique parents 추출
      const parentsMap = new Map<number, Parent>();

      students.forEach((student) => {
        const parent = student.parent;
        parentsMap.set(parent.id, parent);
      });

      const parents = Array.from(parentsMap.values());

      // 5. Nanoid 벌크 upsert
      const dtos = this.buildCreateNanoidDtos(parents, letter.id);
      await this.upsertNanoIds(manager, dtos);

      // 1. mysql pivot 셋팅
      // 2. redis 2개 set 설정
      // 3. if (sendMode === 'IMMEDIATE') { 발송 }

      return letter;
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Methods
  //? ---------------------------------------------------------------------- ?//

  //? 발송 정보 생성
  private async createLetter(
    manager: EntityManager,
    dto: CreateLetterDto,
  ): Promise<Letter> {
    const letter = manager.create(Letter, dto);
    return await manager.save(letter);
  }

  // ------------------------------------------------------------------------ //
  // private methods
  // ------------------------------------------------------------------------ //

  private buildCreateNanoidDtos(
    parents: Parent[],
    letterId: number,
  ): CreateNanoidDto[] {
    const dtos: CreateNanoidDto[] = [];

    for (const parent of parents) {
      const dto: CreateNanoidDto = {
        parentId: parent.id,
        nanoid: nanoid(),
        phone: parent.phone,
        page: 'letters',
        args: `letterId=${letterId}&parentId=${parent.id}`,
        expiresAt: parseValidityToDate('10d'), // @todo 수강신청 끝나는 시점으로 지정 해야함.
      };

      dtos.push(dto);
    }

    return dtos;
  }

  private async upsertNanoIds(
    manager: EntityManager,
    dtos: CreateNanoidDto[],
  ): Promise<void> {
    const batches = chunk(dtos, 500);

    for (const batch of batches) {
      try {
        await manager
          .createQueryBuilder()
          .insert()
          .into(NanoId)
          .values(batch)
          .orUpdate(
            ['nanoid', 'phone', 'expiresAt'],
            ['parentId', 'page', 'args'],
          )
          .execute();
      } catch (error) {
        this.logger.error(`Failed to upsert NanoIds: ${error.message}`);
        throw new InternalServerErrorException('Failed to upsert NanoIds');
      }
    }
  }

  //? 학부모 정보 조회
  private async getStudents(
    manager: EntityManager,
    studentIds: number[],
  ): Promise<Student[]> {
    const students = await manager.find(Student, {
      where: { id: In(studentIds) },
      select: {
        id: true,
        parent: { id: true, phone: true, user: { pushToken: true } },
      },
      relations: { parent: true },
    });

    if (!students.length) {
      throw new NotFoundException('No students found for the given IDs');
    }

    return students;
  }

  //? 학교 유효성 검증
  private async validateSchool(
    manager: EntityManager,
    dto: CreateLetterDto,
  ): Promise<void> {
    const school = await manager.findOne(School, {
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }
    if (!school.phone) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_PHONE_IN_SCHOOL);
    }
  }

  //? 학교 유효성 검증
  private async validateTerm(
    manager: EntityManager,
    dto: CreateLetterDto,
  ): Promise<void> {
    const term = await manager.findOne(Term, { where: { id: dto.termId } });
    if (!term) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_TERM);
    }
  }
}
