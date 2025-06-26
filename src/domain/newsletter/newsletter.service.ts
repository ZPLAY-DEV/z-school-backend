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
import { NotificationStatus } from 'src/common/enums/notification-status';
import { StudentNotificationInfo } from 'src/common/interfaces';
import { IEvent, IEventKey } from 'src/domain/event/entities/event.interface';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { NewsletterDetailResponseDto } from 'src/domain/newsletter/dto/newsletter-detail.response.dto';
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
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 유효성 검증
      const school = await this.checkSchoolValidity(manager, dto);
      const term = await this.checkTermValidity(manager, dto);
      await this.checkExistingRegistrationNewsletter(manager, dto); // mysql record 검사후 거절
      await this.checkExistingRegistrationEvent(dto); // dynamodb record 스캔후 거절
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

  async findDetail(id: number): Promise<NewsletterDetailResponseDto> {
    const newsletter: Newsletter = await this.newsletterRepository.findOne({
      where: { id },
      relations: ['unreadParents'],
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    const unreadParentIds: number[] =
      newsletter.unreadParents?.map((parent) => parent.id) ?? [];

    // unreadParents 관계 제거 (응답에서 제외)
    delete newsletter.unreadParents;

    if (newsletter.studentIds && newsletter.studentIds.length > 0) {
      const students = await this.dataSource
        .getRepository(Student)
        .createQueryBuilder('student')
        .leftJoinAndSelect('student.parent', 'parent')
        .where('student.id IN (:...studentIds)', {
          studentIds: newsletter.studentIds,
        })
        .getMany();

      const studentReadInfos: StudentNotificationInfo[] =
        newsletter.type === NewsletterType.REGISTRATION
          ? students.map((student) => ({
              id: student.id,
              name: student.name,
              grade: student.grade,
              class: student.class,
              studentCode: student.studentCode,
              read: !unreadParentIds.includes(student.parent.id),
            }))
          : students.map((student) => ({
              id: student.id,
              grade: student.grade,
              class: student.class,
              studentCode: student.studentCode,
              name: student.name,
            }));

      return new NewsletterDetailResponseDto(
        newsletter,
        studentReadInfos,
        students.length,
      );
    }

    return new NewsletterDetailResponseDto(newsletter);
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
        await this.handleSendingNewsletter(updatedNewsletter, manager);
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

    const parentIndex =
      newsletter.unreadParents?.findIndex((parent) => parent.id === parentId) ??
      -1;

    if (parentIndex === -1) {
      throw new NotFoundException(
        'Parent not found in unread list or already read',
      );
    }

    // unreadParents에서 해당 parent 제거
    newsletter.unreadParents?.splice(parentIndex, 1);
    await this.dataSource.getRepository(Newsletter).save(newsletter);

    this.logger.log(
      `✅ Marked newsletter ${newsletterId} as read by parent ${parentId}`,
    );
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

    return !newsletter.unreadParents?.some((parent) => parent.id === parentId);
  }

  // ------------------------------------------------------------------------ //
  // private methods
  // ------------------------------------------------------------------------ //

  //? 유효성 검증
  private async checkSchoolValidity(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<School> {
    const school = await manager.findOne(School, {
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

  private async checkTermValidity(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<Term> {
    const term = await manager.findOne(Term, { where: { id: dto.termId } });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    return term;
  }

  private async checkExistingRegistrationNewsletter(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<Newsletter | null> {
    let newsletter: Newsletter | null = null;
    if (dto.type === NewsletterType.REGISTRATION) {
      newsletter = await manager.findOne(Newsletter, {
        where: {
          schoolId: dto.schoolId,
          termId: dto.termId,
          type: NewsletterType.REGISTRATION,
        },
      });
      if (newsletter) {
        throw new BadRequestException('Registration newsletter already exists');
      }
    }
    return newsletter;
  }

  // for create
  private async checkExistingRegistrationEvent(
    dto: CreateNewsletterDto,
  ): Promise<boolean> {
    // REGISTRATION 타입이 아닌 경우 검사하지 않음
    if (dto.type !== NewsletterType.REGISTRATION) {
      return false;
    }

    // event 테이블에서 동일한 schoolId, termId, type이 REGISTRATION인 이벤트 스캔
    const scanResult = await this.model
      .scan({
        FilterExpression:
          '#schoolId = :schoolId AND #termId = :termId AND #type = :type',
        ExpressionAttributeNames: {
          '#schoolId': 'schoolId',
          '#termId': 'termId',
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':schoolId': dto.schoolId,
          ':termId': dto.termId,
          ':type': 'REGISTRATION',
        },
      })
      .exec();

    if (scanResult && scanResult.length > 0) {
      throw new BadRequestException('Registration event already exists');
    }
    return false;
  }

  // for update
  private async checkEventValidity(
    manager: EntityManager,
    newsletter: Newsletter,
  ): Promise<void> {
    // 기존 이벤트가 SENT 상태인지만 확인
    const eventKey = `SCHOOL#${newsletter.schoolId}#NEWSLETTER#${newsletter.id}`;
    const existingEvent = await this.checkExistingEvent(
      eventKey,
      newsletter.scheduledAt!,
    );
    // todo. SENT 상태인 경우에만 에러 발생한다. 그렇다면, FAILED 는 어쩔건데?
    if (existingEvent?.status === EventStatus.SENT) {
      throw new BadRequestException(
        '뉴스레터가 이미 발송된 상태입니다. 수정할 수 없습니다.',
      );
    }
  }

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
    try {
      // deduped 학생정보 가져오기
      const students = await this.getStudents(manager, newsletter);
      // console.log(`✳️ students`, JSON.stringify(students, null, 2));
      const studentIds = students.map((student) => student.id);

      const dedupedStudents = this.dedupeStudents(students);

      // 숏링크 생성
      const shortlinks = await this.createShortlinks(
        manager,
        newsletter,
        dedupedStudents,
      );
      // console.log(`✳️ shortlinks`, JSON.stringify(shortlinks, null, 2));

      // dynamodb 이벤트 생성 (upsert 방식으로 자동 처리)
      await this.createEvent(newsletter, shortlinks, dedupedStudents);

      // 트래킹 엔트리 생성 (읽지 않은 상태로 초기화)
      if (newsletter.type === NewsletterType.REGISTRATION) {
        await this.createTrackingEntries(manager, newsletter, dedupedStudents);
      }

      // newsletter 업데이트
      newsletter.status = NotificationStatus.SENT;
      newsletter.studentIds = studentIds;
      await manager.save(newsletter);

      await this.slack.sendMessage({
        channel: 'activity',
        text: `${newsletter.schoolName}에서 뉴스레터 작성\n- 이름:${newsletter.title}\n- 분류:${translateNewsletterType(newsletter.type)}\n- 대상:${translateNewsletterTarget(newsletter.target)} ${newsletter.studentIds.length}명`,
      });
    } catch (error) {
      this.logger.error(
        `❌ Failed to handle scheduled newsletter: ${error.message}`,
      );
      throw error;
    }
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

    return students;

    // parentId 기준으로 중복 제거 (동일한 부모의 학생은 하나만 유지)
    // const parentIdMap = new Map<number, Student>();
    // students.forEach((student) => {
    //   if (!parentIdMap.has(student.parent.id)) {
    //     parentIdMap.set(student.parent.id, student);
    //   }
    // });
    // return Array.from(parentIdMap.values());
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
