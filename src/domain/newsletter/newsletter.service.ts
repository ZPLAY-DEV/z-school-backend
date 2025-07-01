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
import {
  EventStatus,
  NewsletterTarget,
  NewsletterType,
  StudentStatus,
} from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { StudentReadInfo } from 'src/common/interfaces';
import { IEvent, IEventKey } from 'src/domain/event/entities/event.interface';
import { generateEventKey } from 'src/domain/event/utils/event.utils';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { NewsletterDetailResponseDto } from 'src/domain/newsletter/dto/response-extended-newsletter.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateShortlinkDto } from 'src/domain/shortlink/dto/create-shortlink.dto';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import {
  translateNewsletterTarget,
  translateNewsletterType,
} from 'src/helpers/translate';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, EntityManager, In } from 'typeorm';

@Injectable()
export class NewsletterService {
  private readonly newsletterRepository;
  private readonly logger = new Logger(NewsletterService.name);
  constructor(
    @InjectModel('Event')
    private readonly model: Model<IEvent, IEventKey>,
    private readonly dataSource: DataSource,
    private readonly slack: SlackService,
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
    // 모든 validation을 transaction 밖에서 처리 (Auto-increment ID 낭비 방지)
    const school = await this.checkSchoolValidity(dto);
    const term = await this.checkTermValidity(dto);
    if (dto.type === NewsletterType.REGISTRATION) {
      await this.checkPreviousEventWithDto(dto);
      await this.checkExistingNewsletterWithDto(dto);
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 뉴스레터 생성
      const newsletter = await this.createNewsletter(manager, {
        ...dto,
        schoolName: school.name,
        termName: term.termName,
      });

      // scheduledAt이 설정된 경우 이벤트 처리
      if (newsletter.scheduledAt) {
        await this.handleSendingNewsletter(newsletter, manager);
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

  async find(
    schoolId: number,
    termId: number,
    type?: NewsletterType,
  ): Promise<Newsletter[]> {
    const whereCondition: any = { schoolId, termId };

    if (type) {
      whereCondition.type = type;
    }

    const newsletters = await this.newsletterRepository.find({
      where: whereCondition,
      order: { id: 'DESC' },
    });

    return newsletters as Newsletter[];
  }

  async findOnlyRegistration(
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

  async findDetail(id: number): Promise<NewsletterDetailResponseDto> {
    const newsletter: Newsletter = await this.newsletterRepository.findOne({
      where: { id },
      relations: ['shortlinks'],
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    const readParentIds: number[] =
      newsletter.shortlinks?.filter((v) => v.isRead).map((v) => v.parentId) ??
      [];

    (newsletter as any).shortlinks = undefined;

    if (newsletter.studentIds && newsletter.studentIds.length > 0) {
      const students = await this.dataSource
        .getRepository(Student)
        .createQueryBuilder('student')
        .leftJoinAndSelect('student.parent', 'parent')
        .where('student.id IN (:...studentIds)', {
          studentIds: newsletter.studentIds,
        })
        .getMany();

      const studentReadInfos: StudentReadInfo[] = students.map((student) => ({
        id: student.id,
        name: student.name,
        grade: student.grade,
        class: student.class,
        studentCode: student.studentCode,
        read: readParentIds.includes(student.parent.id),
      }));

      return new NewsletterDetailResponseDto(
        newsletter,
        studentReadInfos,
        students.length,
      );
    }

    return new NewsletterDetailResponseDto(newsletter);
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
      // 저장
      const updatedNewsletter = (await manager.save(newsletter)) as Newsletter;

      // scheduledAt이 새로 설정된 경우에만 이벤트 처리
      const wasScheduledAtNull = !existingNewsletter.scheduledAt;
      const isScheduledAtSet = !!updatedNewsletter.scheduledAt;

      if (wasScheduledAtNull && isScheduledAtSet) {
        await this.handleSendingNewsletter(updatedNewsletter, manager);
      }

      return updatedNewsletter;
    });
  }

  async cancelNewsletter(id: number): Promise<Newsletter> {
    const newsletter: Newsletter = await this.newsletterRepository.preload({
      id,
      status: SendStatus.CANCELED,
    });
    // 재발송 때문에 shortlinks 삭제 안함.
    await this.deleteEvent(newsletter);

    return (await this.newsletterRepository.save(newsletter)) as Newsletter;
  }

  async resendNewsletter(id: number, scheduledAt: Date): Promise<Newsletter> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const newsletter = await manager.preload(Newsletter, {
        id,
        status: SendStatus.SCHEDULED,
        scheduledAt,
        resentAt: scheduledAt,
      });
      const updatedNewsletter = (await manager.save(newsletter)) as Newsletter;

      const students = await this.getStudents(manager, updatedNewsletter);
      const dedupedStudents = this.dedupeStudents(students);
      const shortlinks = await this.fetchShortlinks(manager, updatedNewsletter);

      await this.createEvent(updatedNewsletter, shortlinks, dedupedStudents);

      return updatedNewsletter;
    });
  }

  async markAsRead(newsletterId: number, parentId: number): Promise<void> {
    const result = await this.dataSource
      .getRepository(Shortlink)
      .createQueryBuilder()
      .update(Shortlink)
      .set({ isRead: true })
      .where('newsletterId = :newsletterId AND parentId = :parentId', {
        newsletterId,
        parentId,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(
        `⚠️ No shortlink found for for newsletter ${newsletterId}, parent ${parentId}`,
      );
      return;
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async deleteNewsletter(id: number): Promise<Newsletter> {
    const newsletter = await this.findById(id);
    await this.deleteShortlinks(newsletter);
    await this.deleteEvent(newsletter);
    return (await this.newsletterRepository.softRemove(
      newsletter,
    )) as Newsletter;
  }

  // ------------------------------------------------------------------------ //
  // private methods for newsletters
  // ------------------------------------------------------------------------ //

  //? 뉴스레터 생성
  private async createNewsletter(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<Newsletter> {
    const newsletter = manager.create(Newsletter, dto);
    return await manager.save(newsletter);
  }

  //? 예약된 뉴스레터 처리
  private async handleSendingNewsletter(
    newsletter: Newsletter,
    manager: EntityManager,
  ): Promise<void> {
    console.log(`✳️ handleSendingNewsletter`, newsletter);

    try {
      const students = await this.getStudents(manager, newsletter);
      const studentIds = students.map((student) => student.id);
      const dedupedStudents = this.dedupeStudents(students);
      // 숏링크 생성
      const shortlinks = await this.createShortlinks(
        manager,
        newsletter,
        dedupedStudents,
      );
      // dynamodb 이벤트 레코드 생성
      await this.createEvent(newsletter, shortlinks, dedupedStudents);
      // newsletter 업데이트
      newsletter.status = SendStatus.SCHEDULED;
      newsletter.studentIds = studentIds;
      await manager.save(newsletter);

      await this.slack.sendMessage({
        channel: 'activity',
        text: `${newsletter.schoolName}에서 뉴스레터 발송예약\n- 이름:${newsletter.title}\n- 분류:${translateNewsletterType(newsletter.type)}\n- 대상:${translateNewsletterTarget(newsletter.target)} ${newsletter.studentIds.length}명`,
      });
    } catch (error) {
      this.logger.error(
        `❌ Failed to handle scheduled newsletter: ${error.message}`,
      );
      throw error;
    }
  }

  // ------------------------------------------------------------------------ //
  // private methods for students
  // ------------------------------------------------------------------------ //

  private async getStudents(
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
      // lesson → groups → picks → students 관계를 QueryBuilder로 조회
      students = await manager
        .createQueryBuilder(Student, 'student')
        .leftJoinAndSelect('student.parent', 'parent')
        .leftJoinAndSelect('parent.user', 'user')
        .leftJoin('student.picks', 'pick')
        .leftJoin('pick.group', 'group')
        .leftJoin('group.lesson', 'lesson')
        .where('lesson.id IN (:...lessonIds)', {
          lessonIds: newsletter.targetItems,
        })
        .getMany();
    } else if (newsletter.target === NewsletterTarget.GROUP) {
      if (!newsletter.targetItems) {
        throw new BadRequestException('발송 대상 반 정보가 없습니다.');
      }
      // group → picks → students 관계를 QueryBuilder로 조회
      students = await manager
        .createQueryBuilder(Student, 'student')
        .leftJoinAndSelect('student.parent', 'parent')
        .leftJoinAndSelect('parent.user', 'user')
        .leftJoin('student.picks', 'pick')
        .leftJoin('pick.group', 'group')
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

    return students;
  }

  private dedupeStudents(students: Student[]): Student[] {
    const parentIdMap = new Map<number, Student>();
    students.forEach((student) => {
      if (!parentIdMap.has(student.parent.id)) {
        parentIdMap.set(student.parent.id, student);
      }
    });
    return Array.from(parentIdMap.values());
  }

  // ------------------------------------------------------------------------ //
  // private methods for shortlinks
  // ------------------------------------------------------------------------ //

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
    const shortlinks = await this.fetchShortlinks(manager, newsletter);
    return shortlinks;
  }

  private async fetchShortlinks(
    manager: EntityManager,
    newsletter: Newsletter,
  ): Promise<Shortlink[]> {
    return await manager.find(Shortlink, {
      where: { newsletterId: newsletter.id },
      relations: { parent: true, newsletter: true },
    });
  }

  private async deleteShortlinks(newsletter: Newsletter): Promise<void> {
    try {
      await this.dataSource
        .getRepository(Shortlink)
        .delete({ newsletterId: newsletter.id });
    } catch (error) {
      this.logger.error(
        `❌ Failed to delete shortlinks for newsletter ${newsletter.id}: ${error.message}`,
      );
    }
  }

  // ------------------------------------------------------------------------ //
  // validations
  // ------------------------------------------------------------------------ //

  private async checkSchoolValidity(dto: CreateNewsletterDto): Promise<School> {
    const school = await this.dataSource.getRepository(School).findOne({
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }
    if (dto.scheduledAt && !school.phone) {
      throw new BadRequestException('Missing phone info in school');
    }
    return school;
  }

  private async checkTermValidity(dto: CreateNewsletterDto): Promise<Term> {
    const term = await this.dataSource
      .getRepository(Term)
      .findOne({ where: { id: dto.termId } });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    return term;
  }

  private async checkExistingNewsletterWithDto(
    dto: CreateNewsletterDto,
  ): Promise<void> {
    const newsletters = await this.dataSource.getRepository(Newsletter).find({
      where: {
        schoolId: dto.schoolId,
        termId: dto.termId,
      },
    });

    if (newsletters && newsletters.length > 0) {
      // if (
      //   newsletters.some(
      //     (newsletter) => newsletter.status === SendStatus.SCHEDULED,
      //   )
      // ) {
      //   throw new BadRequestException('Already scheduled.');
      // }
      if (
        dto.type === NewsletterType.REGISTRATION &&
        newsletters.some(
          (newsletter) =>
            newsletter.status === SendStatus.SENT ||
            newsletter.status === SendStatus.SCHEDULED,
        )
      ) {
        throw new BadRequestException(
          'Registration newsletter already sent or scheduled.',
        );
      }
    }
  }

  // ------------------------------------------------------------------------ //
  // private methods for dynamodb
  // ------------------------------------------------------------------------ //

  private async createEvent(
    newsletter: Newsletter,
    shortlinks: Shortlink[],
    students: Student[],
  ): Promise<void> {
    const scheduledTime = newsletter.scheduledAt!;
    const scheduledTimestamp = scheduledTime.getTime();

    console.log(`✳️ scheduledTime`, scheduledTime);
    console.log(`✳️ scheduledTimestamp`, scheduledTimestamp);

    const ttl = Math.floor(scheduledTimestamp / 1000) + 60 * 60 * 24 * 30; // 30일 TTL

    const event = {
      eventKey: generateEventKey(newsletter.schoolId, newsletter.type),
      eventTime: scheduledTimestamp,
      newsletterId: newsletter.id,
      status: EventStatus.SCHEDULED,
      payload: {
        type: newsletter.type as string,
        schoolId: newsletter.schoolId,
        role: 'PARENT',
        messages: students.map((student) => {
          const shortlink = shortlinks.find(
            (shortlink) => shortlink.parentId === student.parent.id,
          );
          const isFcm = !!student.parent?.user?.pushToken;
          const url = `http://afters.kr`;
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

    console.log(`✳️ event`, JSON.stringify(event, null, 2));

    // DynamoDB upsert: 동일한 key면 자동으로 기존 레코드 덮어씀
    await this.model.create(event);
  }

  private async checkPreviousEventWithDto(
    dto: CreateNewsletterDto,
  ): Promise<void> {
    const eventKey = generateEventKey(dto.schoolId, dto.type); // 예) 특정학교의 REGISTRATION 타입 이벤트 조회

    // query로 해당 eventKey의 과거 이벤트들을 조회 (현시각보다 작은 것만)
    const nowTimestamp = Date.now();

    try {
      const events = await this.model
        .query('eventKey')
        .eq(eventKey)
        .where('eventTime')
        .lt(nowTimestamp)
        .exec();

      if (events && events.length > 0) {
        if (events.some((event) => event.status === 'SENT')) {
          throw new BadRequestException('Registration event already sent.');
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to check previous event: ${error.message}`);
      throw error;
    }
  }

  private async deleteEvent(newsletter: Newsletter): Promise<void> {
    if (!newsletter.scheduledAt) {
      return;
    }

    const eventKey = generateEventKey(newsletter.schoolId, newsletter.type);
    const scheduledTimestamp = newsletter.scheduledAt.getTime();
    const event = await this.model.get({
      eventKey,
      eventTime: scheduledTimestamp,
    });

    if (event) {
      await this.model.delete({
        eventKey,
        eventTime: scheduledTimestamp,
      });
    } else {
      this.logger.warn(
        `⚠️ No event found for newsletter ${newsletter.id} at ${newsletter.scheduledAt.toISOString()}`,
      );
    }
  }
}
