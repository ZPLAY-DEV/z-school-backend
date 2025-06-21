import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { AWS_SQS_CLIENT, REDIS_TRACKING_CLIENT } from 'src/common/constants';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateShortlinkDto } from 'src/domain/shortlink/dto/create-shortlink.dto';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import { SqsService } from 'src/services/aws/sqs.service';
import { RedisTrackingService } from 'src/services/redis/redis-tracking.service';
import { DataSource, EntityManager, In } from 'typeorm';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
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
  async create(dto: CreateNewsletterDto): Promise<Newsletter> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 유효성 검증
      await this.validateConditions(manager, dto);
      // 뉴스레터 생성
      const letter = await this.createNewsletter(manager, dto);
      // 대상학생 정보조회
      const students = await this.getStudents(manager, dto);
      // nanoid 벌크생성
      const shortlinks = await this.createShortlinks(manager, letter, students);

      console.log(`❇️`, shortlinks);
      // // events 생성
      // mysql pivot 셋팅, tracking 용 redis 2개 set 설정

      return letter;
    });
  }

  // ------------------------------------------------------------------------ //
  // private methods
  // ------------------------------------------------------------------------ //

  //? 학교 유효성 검증
  private async validateConditions(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<void> {
    const school = await manager.findOne(School, {
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }
    if (!school.phone) {
      throw new BadRequestException('Missing phone info in school');
    }
    const term = await manager.findOne(Term, { where: { id: dto.termId } });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
  }

  //? 발송 정보 생성
  private async createNewsletter(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<Newsletter> {
    const letter = manager.create(Newsletter, dto);
    return await manager.save(letter);
  }

  //? 학생 정보 조회
  private async getStudents(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<Student[]> {
    const students = await manager.find(Student, {
      where: { id: In(dto.ids) },
      relations: { parent: { user: true } },
    });

    if (!students.length) {
      throw new NotFoundException('No students found for the given IDs');
    }

    return students;
  }

  private async createShortlinks(
    manager: EntityManager,
    newsletter: Newsletter,
    students: Student[],
  ): Promise<Shortlink[]> {
    const dtos: CreateShortlinkDto[] = [];

    for (const student of students) {
      const dto: CreateShortlinkDto = {
        parentId: student.parent.id,
        newsletterId: newsletter.id,
        nanoid: nanoid(),
        page: 'newsletters',
        args: `id=${newsletter.id}&studentId=${student.id}&parentId=${student.parent.id}`,
      };
      dtos.push(dto);
    }

    const batches = chunk(dtos, 500);

    for (const batch of batches) {
      try {
        await manager
          .createQueryBuilder()
          .insert()
          .into(Shortlink)
          .values(batch)
          .orUpdate(
            ['nanoid', 'page', 'args', 'note'],
            ['parentId', 'newsletterId'],
          )
          .execute();
      } catch (error) {
        this.logger.error(`Failed to upsert Shortlinks: ${error.message}`);
        throw new InternalServerErrorException('Failed to upsert Shortlinks');
      }
    }

    // 생성된 shortlinks 조회하여 반환
    const shortlinks = await manager.find(Shortlink, {
      where: { newsletterId: newsletter.id },
      relations: { parent: true },
    });

    return shortlinks;
  }

  //? 이벤트 생성
  private createEvents(shortlinks: Shortlink[], students: Student[]): void {
    // TODO: 이벤트 생성 로직 구현
    this.logger.log(`Creating events for ${shortlinks.length} shortlinks`);
    console.log(`❇️`, shortlinks);
    console.log(`❇️`, students);
  }

  //? 트래킹 엔트리 생성
  private createTrackingEntries(
    shortlinks: Shortlink[],
    students: Student[],
  ): void {
    // TODO: 트래킹 엔트리 생성 로직 구현
    this.logger.log(
      `Creating tracking entries for ${shortlinks.length} shortlinks`,
    );
    console.log(`❇️`, shortlinks);
    console.log(`❇️`, students);
  }
}
