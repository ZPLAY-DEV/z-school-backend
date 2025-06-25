import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose/dist/common';
import { EventStatus, NewsletterTarget } from 'src/common/enums';
import { IEvent, IEventKey } from 'src/domain/event/entities/event.interface';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateShortlinkDto } from 'src/domain/shortlink/dto/create-shortlink.dto';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import { translateNewsletterType } from 'src/helpers/translate';
import { DataSource, EntityManager, In } from 'typeorm';

@Injectable()
export class NewsletterService {
  private readonly newsletterRepository;
  private readonly logger = new Logger(NewsletterService.name);
  constructor(
    @InjectModel('Event')
    private readonly model: Model<IEvent, IEventKey>,
    private readonly dataSource: DataSource,
    // @Inject(REDIS_TRACKING_CLIENT)
    // private readonly redisTrackingService: RedisTrackingService,
  ) {
    this.newsletterRepository = this.dataSource.getRepository(Newsletter);
  }

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  //? 학생 대상 발송
  async create(dto: CreateNewsletterDto): Promise<Newsletter> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 유효성 검증
      await this.validateConditions(manager, dto);
      // 뉴스레터 생성
      const newsletter = await this.createNewsletter(manager, dto);

      if (dto.scheduledAt) {
        // deduped 학생정보 리턴
        const students = await this.getStudents(manager, dto);
        // 숏링크 생성
        const shortlinks = await this.createShortlinks(
          manager,
          newsletter,
          students,
        );
        // dynamodb 이벤트 생성 (보내는 날짜 기준 30일 동안만 보관)
        await this.createEvent(newsletter, shortlinks, students);
        // 트래킹 엔트리 생성 (읽지 않은 상태로 초기화)
        await this.createTrackingEntries(manager, newsletter, students);
      }

      return newsletter;
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findById(id: number, relations?: string[]): Promise<Newsletter> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { id },
      relations: relations ? relations : undefined,
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return newsletter as Newsletter;
  }

  async findRegistration(
    schoolId: number,
    termId: number,
  ): Promise<Newsletter> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { schoolId, termId },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return newsletter as Newsletter;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateNewsletterDto): Promise<Newsletter> {
    const newsletter = await this.newsletterRepository.preload({
      id,
      ...dto,
    });
    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }
    // 업데이트
    return this.newsletterRepository.save(newsletter) as Promise<Newsletter>;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 읽음 처리 (ManyToMany 관계에서 제거)
  //? ---------------------------------------------------------------------- ?//

  async markAsRead(newsletterId: number, parentId: number): Promise<void> {
    const newsletter = await this.dataSource.getRepository(Newsletter).findOne({
      where: { id: newsletterId },
      relations: { unreadParents: true },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    const parentIndex = newsletter.unreadParents.findIndex(
      (parent) => parent.id === parentId,
    );

    if (parentIndex === -1) {
      throw new NotFoundException(
        'Parent not found in unread list or already read',
      );
    }

    // unreadParents에서 해당 parent 제거
    newsletter.unreadParents.splice(parentIndex, 1);
    await this.dataSource.getRepository(Newsletter).save(newsletter);

    this.logger.log(
      `✅ Marked newsletter ${newsletterId} as read by parent ${parentId}`,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? 읽지 않은 부모 목록 조회
  //? ---------------------------------------------------------------------- ?//

  async getUnreadParents(newsletterId: number): Promise<Parent[]> {
    const newsletter = await this.dataSource.getRepository(Newsletter).findOne({
      where: { id: newsletterId },
      relations: { unreadParents: true },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return newsletter.unreadParents;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 읽음 상태 확인
  //? ---------------------------------------------------------------------- ?//

  async isReadByParent(
    newsletterId: number,
    parentId: number,
  ): Promise<boolean> {
    const newsletter = await this.dataSource.getRepository(Newsletter).findOne({
      where: { id: newsletterId },
      relations: { unreadParents: true },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return !newsletter.unreadParents.some((parent) => parent.id === parentId);
  }

  // ------------------------------------------------------------------------ //
  // private methods
  // ------------------------------------------------------------------------ //

  //? 유효성 검증
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

  //? 뉴스레터 생성
  private async createNewsletter(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<Newsletter> {
    const letter = manager.create(Newsletter, dto);
    return await manager.save(letter);
  }

  //? deduped 학생정보 리턴
  private async getStudents(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<Student[]> {
    if (!dto.ids) {
      throw new NotFoundException('No studentIds are given');
    }

    let students: Student[] = [];
    if (dto.target === NewsletterTarget.SCHOOL) {
      students = await manager.getRepository(Student).find({
        where: { schoolId: dto.schoolId },
        relations: ['parent', 'parent.user'],
      });
      return students;
    }

    students = await manager.find(Student, {
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

  //? 숏링크 생성
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

    // a compound unique key constraint with parentId and newsletterId
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

  //? dynamodb 이벤트 생성 (보내는 날짜 기준 30일 동안만 보관)
  private async createEvent(
    newsletter: Newsletter,
    shortlinks: Shortlink[],
    students: Student[],
  ): Promise<void> {
    const now = new Date();
    const scheduledTime = newsletter.scheduledAt || now;
    const ttl = Math.floor(scheduledTime.getTime() / 1000) + 60 * 60 * 24 * 30; // 30일 TTL

    const event = {
      eventKey: `SCHOOL#${newsletter.schoolId}#NEWSLETTER#${newsletter.id}`,
      timestamp: scheduledTime.toISOString(),
      type: 'NEWSLETTER',
      newsletterId: newsletter.id,
      schoolId: newsletter.schoolId,
      status: EventStatus.PENDING,
      payload: {
        type: newsletter.type as string,
        schoolId: newsletter.schoolId,
        role: 'PARENT',
        messages: students.map((student) => {
          const shortlink = shortlinks.find(
            (shortlink) => shortlink.parentId === student.parent.id,
          );
          const isFcm = !!student.parent?.user?.pushToken;
          const url = `http://localhost:3000/newsletters`;
          return {
            id: student.parent.id,
            phone: student.parent.phone,
            token: student.parent?.user?.pushToken,
            title: translateNewsletterType(newsletter.type),
            body: isFcm
              ? `${newsletter.title}`
              : `${newsletter.title} ${url}/${shortlink?.nanoid}`,
            role: 'PARENT',
            page: 'newsletters',
            args: `id=${newsletter.id}&studentId=${student.id}&parentId=${student.parent.id}`,
          };
        }),
      },
      expires: ttl,
    };
    await this.model.create(event);
  }

  //? 트래킹 엔트리 생성 (읽지 않은 상태로 초기화)
  private async createTrackingEntries(
    manager: EntityManager,
    newsletter: Newsletter,
    students: Student[],
  ): Promise<void> {
    // 중복 제거된 parent들 추출
    const parents = students.map((student) => student.parent);

    // newsletter의 unreadParents에 추가
    newsletter.unreadParents = parents;
    await manager.save(newsletter);
  }
}
