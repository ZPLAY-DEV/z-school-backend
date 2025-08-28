import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromZonedTime } from 'date-fns-tz';
import { nanoid } from 'nanoid';
import {
  NewsletterTarget,
  NewsletterType,
  StudentStatus,
} from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { StudentReadInfo } from 'src/common/interfaces';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { CreateRegistrationNewsletterDto } from 'src/domain/newsletter/dto/create-registration-newsletter.dto';
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
import { getMobileRoute } from 'src/helpers/uri';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, EntityManager, In, LessThan } from 'typeorm';

@Injectable()
export class NewsletterService {
  private readonly newsletterRepository;
  private readonly logger = new Logger(NewsletterService.name);
  private readonly domain;
  constructor(
    private readonly dataSource: DataSource,
    private readonly slack: SlackService,
    private readonly configService: ConfigService,
    // @Inject(REDIS_TRACKING_CLIENT)
    // private readonly redisTrackingService: RedisTrackingService,
  ) {
    this.newsletterRepository = this.dataSource.getRepository(Newsletter);
    this.domain =
      this.configService.get('nodeEnv') === 'prod'
        ? 'https://스쿨허브.kr'
        : 'https://dev.스쿨허브.kr';
  }

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  //? 학생 대상 발송
  async create(dto: CreateNewsletterDto): Promise<Newsletter> {
    const { schoolId, termId, scheduledAt, type } = dto;
    // 모든 validation을 transaction 밖에서 처리 (Auto-increment ID 낭비 방지)
    const school = await this.checkSchoolValidity(schoolId, scheduledAt);
    const term = await this.checkTermValidity(termId, dto.type);
    if (dto.type === NewsletterType.REGISTRATION) {
      await this.checkExistingNewsletterWithDto(schoolId, termId, type);
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

  async createRegistrationNewsletter(
    dto: CreateRegistrationNewsletterDto,
  ): Promise<Newsletter> {
    const { schoolId, termId, images, date } = dto;

    const term = await this.checkTermValidity(termId, 'REGISTRATION');
    const scheduledAt = date ?? term.bookingStart!;
    const school = await this.checkSchoolValidity(schoolId, scheduledAt);
    await this.checkExistingNewsletterWithDto(
      schoolId,
      termId,
      NewsletterType.REGISTRATION,
    );

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 뉴스레터 생성
      const newsletter = await this.createNewsletter(manager, {
        schoolId,
        termId,
        schoolName: school.name,
        termName: term.termName,
        title: `${school.name} ${term.termName} 수강신청 바로가기`,
        body: '',
        images,
        type: NewsletterType.REGISTRATION,
        target: NewsletterTarget.GRADE,
        targetItems: [1, 2, 3, 4, 5, 6],
        targetLabel: `${school.name} 전교생`,
        scheduledAt,
      });
      // scheduledAt이 설정된 경우 이벤트 처리
      await this.handleSendingNewsletter(newsletter, manager);
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
    termId?: number,
    type?: NewsletterType,
  ): Promise<Newsletter[]> {
    const whereCondition: any = { schoolId: schoolId };

    if (termId) {
      whereCondition.termId = +termId;
    }

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
      order: { id: 'DESC' },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return newsletter as Newsletter;
  }

  async findOnlyNewslettersToBeSent(): Promise<Newsletter[]> {
    // 현재 서울 시간을 UTC로 변환
    const nowInSeoul = new Date();
    const nowInUTC = fromZonedTime(nowInSeoul, 'Asia/Seoul');

    const newsletters = await this.newsletterRepository.find({
      where: {
        status: SendStatus.SCHEDULED,
        scheduledAt: LessThan(nowInUTC),
      },
      order: { scheduledAt: 'DESC' },
    });

    return newsletters as Newsletter[];
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
        .leftJoinAndSelect('parent.shortlinks', 'shortlinks')
        .where('student.id IN (:...studentIds)', {
          studentIds: newsletter.studentIds,
        })
        .getMany();

      const studentReadInfos: StudentReadInfo[] = students.map((student) => {
        const link = student.parent.shortlinks?.find(
          (v) => v.newsletterId === newsletter.id,
        );
        return {
          id: student.id,
          name: student.name,
          grade: student.grade,
          class: student.class,
          studentCode: student.studentCode,
          link: link
            ? `https://app.schoolhub.co.kr/parent/nanoid/${link.nanoid}`
            : null,
          read: readParentIds.includes(student.parent.id),
        };
      });

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

      // scheduledAt이 새로 설정된 경우에만 이벤트 처리
      const wasRescheduledAtNull = !existingNewsletter.rescheduledAt;
      const isRescheduledAtSet = !!updatedNewsletter.rescheduledAt;
      if (wasRescheduledAtNull && isRescheduledAtSet) {
        await this.handleResendingNewsletter(updatedNewsletter, manager);
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

    return (await this.newsletterRepository.save(newsletter)) as Newsletter;
  }

  async resendNewsletter(id: number, rescheduledAt: Date): Promise<Newsletter> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const newsletter = await manager.preload(Newsletter, {
        id,
        status: SendStatus.RESCHEDULED,
        rescheduledAt,
      });
      if (!newsletter) {
        throw new NotFoundException('Newsletter not found');
      }
      const updatedNewsletter = await manager.save(newsletter);

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
    return (await this.newsletterRepository.softRemove(
      newsletter,
    )) as Newsletter;
  }

  // ------------------------------------------------------------------------ //
  // private methods for newsletters
  // ------------------------------------------------------------------------ //

  //? 뉴스레터 생성 (upsert for REGISTRATION type only)
  private async createNewsletter(
    manager: EntityManager,
    dto: CreateNewsletterDto,
  ): Promise<Newsletter> {
    // REGISTRATION 타입인 경우에만 기존 뉴스레터 확인
    if (dto.type === NewsletterType.REGISTRATION) {
      const existingNewsletter = await manager.findOne(Newsletter, {
        where: {
          schoolId: dto.schoolId,
          termId: dto.termId,
          type: dto.type,
        },
      });

      if (existingNewsletter) {
        const updatedNewsletter = manager.merge(
          Newsletter,
          existingNewsletter,
          dto,
        );
        return await manager.save(updatedNewsletter);
      }
    }

    // REGISTRATION이 아니거나 기존 뉴스레터가 없는 경우 새로 생성
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

      console.log(`✳️ shortlinks`, JSON.stringify(shortlinks, null, 2));

      // newsletter 업데이트
      const payload = this.buildNotificationPayload(
        newsletter,
        shortlinks,
        dedupedStudents,
      );

      console.log(`✳️ payload`, JSON.stringify(payload, null, 2));

      newsletter.payload = payload;
      newsletter.status = SendStatus.SCHEDULED;
      newsletter.studentIds = studentIds;
      await manager.save(newsletter);

      await this.slack.sendMessage({
        channel: 'activity',
        text: `[API] 🟢 ${newsletter.schoolName}에서 뉴스레터 발송 중\n- 이름:${newsletter.title}\n- 분류:${translateNewsletterType(newsletter.type)}\n- 대상:${translateNewsletterTarget(newsletter.target)} ${shortlinks.length}명`,
      });
    } catch (err) {
      this.logger.error(
        `❌ Failed to handle scheduled newsletter: ${err.message}`,
        err,
      );
    }
  }

  //? 예약된 뉴스레터 처리
  private async handleResendingNewsletter(
    newsletter: Newsletter,
    manager: EntityManager,
  ): Promise<void> {
    console.log(`✳️ handleSendingNewsletter`, newsletter);

    try {
      // 안읽은 숏링크
      const shortlinks = await this.fetchUnreadShortlinks(manager, newsletter);
      // newsletter 업데이트
      newsletter.payload = this.rebuildNotificationPayload(
        newsletter,
        shortlinks,
      );
      await manager.save(newsletter);

      await this.slack.sendMessage({
        channel: 'activity',
        text: `[API] 🟢 ${newsletter.schoolName}에서 뉴스레터 재발송 중\n- 이름:${newsletter.title}\n- 분류:${translateNewsletterType(newsletter.type)}\n- 대상:${translateNewsletterTarget(newsletter.target)} ${shortlinks.length}명`,
      });
    } catch (err) {
      this.logger.error(
        `❌ Failed to handle scheduled newsletter: ${err.message}`,
        err,
      );
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
        uri: getMobileRoute(newsletter),
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

  private async fetchUnreadShortlinks(
    manager: EntityManager,
    newsletter: Newsletter,
  ): Promise<Shortlink[]> {
    return await manager.find(Shortlink, {
      where: { newsletterId: newsletter.id, isRead: false },
      relations: { parent: { user: true } },
    });
  }

  private async deleteShortlinks(newsletter: Newsletter): Promise<void> {
    try {
      await this.dataSource
        .getRepository(Shortlink)
        .delete({ newsletterId: newsletter.id });
    } catch (err) {
      this.logger.error(
        `❌ Failed to delete shortlinks for newsletter ${newsletter.id}: ${err.message}`,
        err,
      );
    }
  }

  // ------------------------------------------------------------------------ //
  // validations
  // ------------------------------------------------------------------------ //

  private async checkSchoolValidity(schoolId, scheduledAt): Promise<School> {
    const school = await this.dataSource.getRepository(School).findOne({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }
    if (scheduledAt && !school.phone) {
      throw new BadRequestException('Missing phone info in school');
    }
    return school;
  }

  private async checkTermValidity(termId, type: string): Promise<Term> {
    const term = await this.dataSource
      .getRepository(Term)
      .findOne({ where: { id: termId } });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    if (type === 'REGISTRATION' && !term.bookingStart) {
      throw new BadRequestException('Term bookingStart is not set');
    }
    return term;
  }

  private async checkExistingNewsletterWithDto(
    schoolId: number,
    termId: number,
    type: NewsletterType,
  ): Promise<void> {
    const newsletters = await this.dataSource.getRepository(Newsletter).find({
      where: {
        schoolId,
        termId,
      },
    });

    if (newsletters && newsletters.length > 0) {
      if (
        type === NewsletterType.REGISTRATION &&
        newsletters.some(
          (newsletter) => newsletter.type === NewsletterType.REGISTRATION,
        )
      ) {
        throw new BadRequestException(
          '❌ Registration newsletter already sent or scheduled.',
        );
      }
    }
  }

  private buildNotificationPayload(
    newsletter: Newsletter,
    shortlinks: Shortlink[],
    students: Student[],
  ): {
    type: string;
    schoolId: number;
    role: string;
    messages: any[];
  } {
    return {
      type: newsletter.type as string,
      schoolId: newsletter.schoolId,
      role: 'PARENT',
      messages: students.map((student) => {
        const shortlink = shortlinks.find(
          (shortlink) => shortlink.parentId === student.parent.id,
        );
        const isFcm = !!student.parent?.user?.pushToken;
        return {
          id: student.parent.id,
          phone: student.parent.phone,
          token: student.parent?.user?.pushToken,
          title: translateNewsletterType(newsletter.type),
          body: isFcm
            ? `${newsletter.title}`
            : `${newsletter.title} ${this.domain}/${shortlink?.nanoid}`,
          role: 'PARENT',
          uri: getMobileRoute(newsletter),
          args: `id=${newsletter.id}&studentId=${student.id}&parentId=${student.parent.id}`,
        };
      }),
    };
  }

  private rebuildNotificationPayload(
    newsletter: Newsletter,
    shortlinks: Shortlink[], // unread shortlinks
  ): {
    type: string;
    schoolId: number;
    role: string;
    messages: any[];
  } {
    return {
      type: newsletter.type as string,
      schoolId: newsletter.schoolId,
      role: 'PARENT',
      messages: shortlinks.map((shortlink) => {
        const isFcm = !!shortlink.parent?.user?.pushToken;
        return {
          id: shortlink.parent.id, // 학부모 아이디
          phone: shortlink.parent.phone,
          token: shortlink.parent?.user?.pushToken,
          title: `[재발송] ${translateNewsletterType(newsletter.type)}`,
          body: isFcm
            ? `${newsletter.title}`
            : `[재발송] ${newsletter.title} ${this.domain}/${shortlink?.nanoid}`,
          role: 'PARENT',
          uri: shortlink.uri,
          page: shortlink.page,
          args: shortlink.args,
        };
      }),
    };
  }
}
