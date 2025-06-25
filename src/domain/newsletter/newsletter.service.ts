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
import { EventStatus, NewsletterTarget, StudentStatus } from 'src/common/enums';
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

      // scheduledAt이 설정된 경우 이벤트 처리
      if (newsletter.scheduledAt) {
        await this.handleScheduledNewsletter(newsletter, manager);
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
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 기존 뉴스레터 조회
      const existingNewsletter = await manager.findOne(Newsletter, {
        where: { id },
        relations: { school: true },
      });

      if (!existingNewsletter) {
        throw new NotFoundException('Newsletter not found');
      }

      if (dto.scheduledAt && !existingNewsletter?.school?.phone) {
        throw new BadRequestException('Missing phone info in school');
      }

      // 업데이트할 데이터로 preload
      const newsletter = await this.newsletterRepository.preload({
        id,
        ...dto,
      });

      if (!newsletter) {
        throw new NotFoundException('Newsletter not found');
      }

      // 저장
      const updatedNewsletter = (await manager.save(newsletter)) as Newsletter;

      // scheduledAt이 새로 설정된 경우에만 이벤트 처리
      const wasScheduledAtNull = !existingNewsletter.scheduledAt;
      const isScheduledAtSet = !!updatedNewsletter.scheduledAt;

      if (wasScheduledAtNull && isScheduledAtSet) {
        await this.handleScheduledNewsletter(updatedNewsletter, manager);
      }

      return updatedNewsletter;
    });
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

    if (dto.scheduledAt && !school.phone) {
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

  //? 예약된 뉴스레터 처리
  private async handleScheduledNewsletter(
    newsletter: Newsletter,
    manager: EntityManager,
  ): Promise<void> {
    try {
      // 기존 이벤트가 SENT 상태인지만 확인
      const eventKey = `SCHOOL#${newsletter.schoolId}#NEWSLETTER#${newsletter.id}`;
      const existingEvent = await this.checkExistingEvent(
        eventKey,
        newsletter.scheduledAt!,
      );

      // SENT 상태인 경우에만 에러 발생
      if (existingEvent?.status === EventStatus.SENT) {
        throw new BadRequestException(
          '뉴스레터가 이미 발송된 상태입니다. 수정할 수 없습니다.',
        );
      }

      // deduped 학생정보 가져오기
      const students = await this.getDedupedStudents(manager, newsletter);

      console.log(`✳️ students`, students);

      // 숏링크 생성
      const shortlinks = await this.createShortlinks(
        manager,
        newsletter,
        students,
      );

      console.log(`✳️ shortlinks`, shortlinks);

      // dynamodb 이벤트 생성 (upsert 방식으로 자동 처리)
      await this.createEvent(newsletter, shortlinks, students);

      // 트래킹 엔트리 생성 (읽지 않은 상태로 초기화)
      await this.createTrackingEntries(manager, newsletter, students);

      this.logger.log(
        `✅ Newsletter event created for newsletter ${newsletter.id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to handle scheduled newsletter: ${error.message}`,
      );
      throw error;
    }
  }

  private async checkExistingEvent(
    eventKey: string,
    scheduledAt: Date,
  ): Promise<IEvent | null> {
    try {
      const event = await this.model.get({
        eventKey,
        timestamp: scheduledAt.toISOString(),
      });
      return event;
    } catch {
      // 레코드가 없는 경우 null 반환
      return null;
    }
  }

  private async getDedupedStudents(
    manager: EntityManager,
    newsletter: Newsletter,
  ): Promise<Student[]> {
    let students: Student[] = [];

    if (newsletter.target === NewsletterTarget.SCHOOL) {
      students = await manager.find(Student, {
        where: { schoolId: newsletter.schoolId },
        relations: { parent: { user: true } },
      });
    } else if (newsletter.target === NewsletterTarget.GRADE) {
      if (!newsletter.targetItems) {
        throw new BadRequestException('발송 대상 학년 정보가 없습니다.');
      }
      students = await manager.find(Student, {
        where: { grade: In(newsletter.targetItems) },
        relations: { parent: { user: true } },
      });
    } else if (newsletter.target === NewsletterTarget.LESSON) {
      if (!newsletter.targetItems) {
        throw new BadRequestException('발송 대상 강좌 정보가 없습니다.');
      }
      // lesson → groups → students 관계를 QueryBuilder로 조회
      students = await manager
        .createQueryBuilder(Student, 'student')
        .leftJoinAndSelect('student.parent', 'parent')
        .leftJoinAndSelect('parent.user', 'user')
        .leftJoin('student.groups', 'group')
        .leftJoin('group.lesson', 'lesson')
        .where('lesson.id IN (:...lessonIds)', {
          lessonIds: newsletter.targetItems,
        })
        .getMany();
    } else if (newsletter.target === NewsletterTarget.GROUP) {
      if (!newsletter.targetItems) {
        throw new BadRequestException('발송 대상 반 정보가 없습니다.');
      }
      // group → students 관계를 QueryBuilder로 조회
      students = await manager
        .createQueryBuilder(Student, 'student')
        .leftJoinAndSelect('student.parent', 'parent')
        .leftJoinAndSelect('parent.user', 'user')
        .leftJoin('student.groups', 'group')
        .where('group.id IN (:...groupIds)', {
          groupIds: newsletter.targetItems,
        })
        .getMany();
    } else {
      if (!newsletter.targetItems) {
        throw new BadRequestException('발송 대상 학생 정보가 없습니다.');
      }
      students = await manager.find(Student, {
        where: { id: In(newsletter.targetItems) },
        relations: { parent: { user: true } },
      });
    }

    // 전학생 제외 필터링
    students = students.filter(
      (student) => student.status === StudentStatus.ATTENDING,
    );

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
        throw new InternalServerErrorException('숏링크 생성에 실패했습니다.');
      }
    }

    // 생성된 shortlinks 조회하여 반환
    const shortlinks = await manager.find(Shortlink, {
      where: { newsletterId: newsletter.id },
      relations: { parent: true, newsletter: true },
    });

    return shortlinks;
  }

  private async createEvent(
    newsletter: Newsletter,
    shortlinks: Shortlink[],
    students: Student[],
  ): Promise<void> {
    const scheduledTime = newsletter.scheduledAt!;
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

    console.log(`✳️ event`, event);

    // DynamoDB upsert: 동일한 key면 자동으로 기존 레코드 덮어씀
    await this.model.create(event);
  }

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
