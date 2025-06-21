import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose/dist/common';
import { REDIS_TRACKING_CLIENT } from 'src/common/constants';
import { EventStatus } from 'src/common/enums';
import { IEvent, IEventKey } from 'src/domain/event/entities/event.interface';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateShortlinkDto } from 'src/domain/shortlink/dto/create-shortlink.dto';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import { RedisTrackingService } from 'src/services/redis/redis-tracking.service';
import { DataSource, EntityManager, In } from 'typeorm';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  constructor(
    @InjectModel('Event')
    private readonly model: Model<IEvent, IEventKey>,
    @Inject(REDIS_TRACKING_CLIENT)
    private readonly redisTrackingService: RedisTrackingService,
    private readonly dataSource: DataSource,
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
      // 대상학생 조회 (dedups parentId)
      const students = await this.getStudents(manager, dto);
      // nanoid 벌크생성
      const shortlinks = await this.createShortlinks(manager, letter, students);
      // dynamodb events 생성
      await this.createEvent(letter, shortlinks, students);

      // tracking 용 mysql pivot 셋팅, redis 2개 set 설정

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

    // parentId 기준으로 중복 제거 (동일한 부모의 학생은 하나만 유지)
    const parentIdMap = new Map<number, Student>();
    students.forEach((student) => {
      if (!parentIdMap.has(student.parent.id)) {
        parentIdMap.set(student.parent.id, student);
      }
    });

    return Array.from(parentIdMap.values());
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

    // parentId 와 newsletterId 가 중복되는 경우, 이전 데이터를 덮어쓴다.
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
  private async createEvent(
    newsletter: Newsletter,
    shortlinks: Shortlink[],
    students: Student[],
  ): Promise<void> {
    const now = new Date();
    const scheduledTime = newsletter.scheduledAt || now;
    const ttl = Math.floor(scheduledTime.getTime() / 1000) + 60 * 60 * 24 * 7; // 7일 TTL

    const eventItem = {
      status: EventStatus.PENDING,
      timestamp: scheduledTime.toISOString(),
      type: 'NEWSLETTER',
      payload: {
        newsletterId: newsletter.id,
        schoolId: newsletter.schoolId,
        items: students.map((student) => {
          const shortlink = shortlinks.find(
            (shortlink) => shortlink.parentId === student.parent.id,
          );
          const isFcm = !!student.parent?.user?.pushToken;
          const url = `http://localhost:3000/newsletters`;
          return {
            id: student.parent.id,
            phone: student.parent.phone,
            token: student.parent?.user?.pushToken,
            title: newsletter.title,
            body: isFcm
              ? `${newsletter.title}`
              : `${newsletter.title} ${url}/${shortlink?.nanoid}`,
            role: 'PARENT',
            page: 'newsletters',
            args: `id=${newsletter.id}&studentId=${student.id}&parentId=${student.parent.id}`,
          };
        }),
        length: students.length,
      },
      expires: ttl,
    };

    // DynamoDB에 이벤트 생성
    await this.model.create(eventItem);

    this.logger.log(
      `✅ Created event for newsletter ${newsletter.id} with ${students.length} recipients`,
    );
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
