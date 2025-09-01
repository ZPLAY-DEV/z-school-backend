import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotAcceptableException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { fromZonedTime } from 'date-fns-tz';
import { nanoid } from 'nanoid';
import {
  NewsletterTarget,
  NewsletterType,
  StudentStatus,
} from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { CreateDispatchDto } from 'src/domain/newsletter/dto/create-dispatch.dto';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { CreateShortlinkDto } from 'src/domain/newsletter/dto/create-shortlink.dto';
import { NewsletterWithReadStatsDto } from 'src/domain/newsletter/dto/newsletter-with-read-stats.dto';
import { ReadStatDto } from 'src/domain/newsletter/dto/read-stat.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Dispatch } from 'src/domain/newsletter/entities/dispatch.entity';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Shortlink } from 'src/domain/newsletter/entities/shortlink.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import {
  translateNewsletterTarget,
  translateNewsletterType,
} from 'src/helpers/translate';
import { getMobileRoute } from 'src/helpers/uri';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, EntityManager, In, LessThan, Repository } from 'typeorm';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly domain;
  constructor(
    @InjectRepository(Newsletter)
    private readonly newsletterRepository: Repository<Newsletter>,
    @InjectRepository(Dispatch)
    private readonly dispatchRepository: Repository<Dispatch>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    private readonly dataSource: DataSource,
    private readonly slack: SlackService,
    private readonly configService: ConfigService,
    // @Inject(REDIS_TRACKING_CLIENT)
    // private readonly redisTrackingService: RedisTrackingService,
  ) {
    this.domain =
      this.configService.get('nodeEnv') === 'prod'
        ? 'https://스쿨허브.kr'
        : 'https://dev.스쿨허브.kr';
  }

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async createNewsletter(
    dto: CreateNewsletterDto & CreateDispatchDto,
  ): Promise<Newsletter> {
    // transaction 밖에서 validation 처리 (Auto-increment ID 낭비 방지)
    const school = await this._checkSchoolValidity(dto.schoolId);
    const term = await this._checkTermValidity(dto.termId);
    await this._checkNewsletterValidity(dto);
    let title: string;

    if (dto.type === NewsletterType.REGISTRATION) {
      title = `${school.name} ${term.termName} 수강신청 바로가기`;
    } else {
      title = dto.title || `${school.name} ${term.termName} 공지사항`;
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const newsletter = await manager.save(
        manager.create(Newsletter, {
          schoolId: dto.schoolId,
          termId: dto.termId,
          schoolName: school.name,
          termName: term.termName,
          title: title,
          body: dto.body || null,
          images: dto.images || null,
        }),
      );

      if (dto.target && dto.targetItems) {
        const dispatch = await manager.save(manager.create(Dispatch, dto));
        const { students, label } = await this._getTargetStudents(
          manager,
          newsletter.schoolId,
          dto.target,
          dto.targetItems,
        );
        const dedupedStudents = this._dedupeStudents(students);
        const studentIds = dedupedStudents.map((student) => student.id);
        // 숏링크 생성
        const shortlinks = await this._createShortlinks(
          manager,
          newsletter,
          dedupedStudents,
        );
        const payload = this._buildNotificationPayload(
          newsletter,
          shortlinks,
          dedupedStudents,
        );
        // dispatch 업데이트
        dispatch.payload = payload;
        dispatch.studentIds = studentIds;
        await manager.save(dispatch);
      }

      return newsletter;
    });
  }

  async sendNewsletter(
    newsletterId: number,
    dto: CreateDispatchDto,
  ): Promise<Dispatch> {
    // transaction 밖에서 validation 처리 (Auto-increment ID 낭비 방지)
    const newsletter = await this.newsletterRepository.findOneOrFail({
      where: { id: newsletterId },
      relations: ['school', 'term'],
    });

    if (newsletter.type === NewsletterType.REGISTRATION) {
      await this._isRegistrationNewsletterAlreadySentOrScheduled(
        newsletter.schoolId,
        newsletter.termId,
      );

      if (!newsletter.term.bookingStart) {
        throw new BadRequestException('❌ Missing bookingStart info in term');
      }
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const dispatch = await manager.save(manager.create(Dispatch, dto));
      const { students, label } = await this._getTargetStudents(
        manager,
        newsletter.schoolId,
        dispatch.target!,
        dispatch.targetItems!,
      );
      const dedupedStudents = this._dedupeStudents(students);
      const studentIds = dedupedStudents.map((student) => student.id);
      // 숏링크 생성
      const shortlinks = await this._createShortlinks(
        manager,
        newsletter,
        dedupedStudents,
      );
      // dispatch 업데이트
      const payload = this._buildNotificationPayload(
        newsletter,
        shortlinks,
        dedupedStudents,
      );
      // dispatch 업데이트
      dispatch.payload = payload;
      dispatch.studentIds = studentIds;
      return await manager.save(dispatch);
    });
  }

  async resendNewsletter(id: number): Promise<void> {
    const newsletter = await this.findById(id, ['dispatches', 'shortlinks']);

    if (!newsletter.dispatches || newsletter.dispatches.length < 1) {
      throw new UnprocessableEntityException('never sent out');
    }

    const scheduledDispatch = newsletter.dispatches.find(
      (dispatch) =>
        !dispatch.target && dispatch.status === SendStatus.SCHEDULED,
    );
    if (scheduledDispatch) {
      throw new ConflictException('already scheduled');
    }

    const unreadShortlinks = newsletter.shortlinks.filter(
      (shortlink) => !shortlink.isRead,
    );
    if (unreadShortlinks.length === 0) {
      throw new NotAcceptableException('no unread shortlinks');
    }

    // unread한 parent들의 정보 조회 (phone, pushToken 포함)
    const unreadParentIds = unreadShortlinks.map(
      (shortlink) => shortlink.parentId,
    );
    const shortlinks = await this.dataSource
      .getRepository(Shortlink)
      .createQueryBuilder('shortlink')
      .leftJoinAndSelect('shortlink.parent', 'parent')
      .leftJoinAndSelect('parent.user', 'user')
      .where('shortlink.newsletterId = :newsletterId', {
        newsletterId: newsletter.id,
      })
      .andWhere('shortlink.parentId IN (:...parentIds)', {
        parentIds: unreadParentIds,
      })
      .andWhere('shortlink.isRead = :isRead', { isRead: false })
      .getMany();

    // payload 재구성
    const payload = {
      type: newsletter.type as string,
      schoolId: newsletter.schoolId,
      role: 'PARENT',
      messages: shortlinks.map((shortlink) => {
        const isFcm = !!shortlink.parent?.user?.pushToken;
        return {
          id: shortlink.parent.id,
          phone: shortlink.parent.phone,
          token: shortlink.parent?.user?.pushToken,
          title: translateNewsletterType(newsletter.type),
          body: isFcm
            ? `${newsletter.title}`
            : `${newsletter.title} ${this.domain}/${shortlink.nanoid}`,
          role: 'PARENT',
          page: 'newsletters',
          args: shortlink.args,
        };
      }),
    };

    const dispatch = this.dataSource.getRepository(Dispatch).create({
      newsletterId: newsletter.id,
      target: null,
      targetItems: null,
      targetLabel: null,
      payload,
      status: SendStatus.SCHEDULED,
      scheduledAt: new Date(), // 즉시 발송
    });
    await this.dataSource.getRepository(Dispatch).save(dispatch);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async list(
    schoolId: number,
    termId?: number,
    type?: NewsletterType,
  ): Promise<Newsletter[]> {
    const queryBuilder = this.newsletterRepository
      .createQueryBuilder('newsletter')
      .where('newsletter.schoolId = :schoolId', { schoolId });

    if (termId) {
      queryBuilder.andWhere('newsletter.termId = :termId', { termId: +termId });
    }

    if (type) {
      queryBuilder.andWhere('newsletter.type = :type', { type });
    }

    return await queryBuilder.orderBy('newsletter.id', 'DESC').getMany();
  }

  async findRegistrationNewsletter(
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

    return newsletter;
  }

  async findById(id: number, relations?: string[]): Promise<Newsletter> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { id },
      relations: relations,
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return newsletter;
  }

  async findDetailById(
    newsletterId: number,
  ): Promise<NewsletterWithReadStatsDto> {
    const newsletter: Newsletter =
      await this.newsletterRepository.findOneOrFail({
        where: { id: newsletterId },
        relations: ['dispatches', 'shortlinks'],
      });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    const dispatchedStudentIds = Array.from(
      new Set(newsletter.dispatches.flatMap((v) => v.studentIds)),
    );
    const readParentIds: number[] =
      newsletter.shortlinks?.filter((v) => v.isRead).map((v) => v.parentId) ??
      [];

    (newsletter as any).shortlinks = undefined;

    if (dispatchedStudentIds && dispatchedStudentIds.length > 0) {
      const students = await this.dataSource
        .getRepository(Student)
        .createQueryBuilder('student')
        .leftJoinAndSelect('student.parent', 'parent')
        .leftJoinAndSelect('parent.shortlinks', 'shortlinks')
        .where('student.id IN (:...studentIds)', {
          studentIds: dispatchedStudentIds,
        })
        .getMany();

      const readStats: ReadStatDto[] = students.map((student) => {
        const shortlink = student.parent.shortlinks?.find(
          (v) => v.newsletterId === newsletter.id,
        );
        return {
          id: student.id,
          name: student.name,
          grade: student.grade,
          class: student.class,
          studentCode: student.studentCode,
          link: shortlink
            ? `https://app.schoolhub.co.kr/parent/nanoid/${shortlink.nanoid}`
            : null,
          read: readParentIds.includes(student.parent.id),
          createdAt: shortlink?.createdAt ?? new Date(),
        };
      });

      return new NewsletterWithReadStatsDto({
        ...newsletter,
        readStats,
        total: readStats.length,
      });
    }

    return new NewsletterWithReadStatsDto(newsletter);
  }

  async findPendingDispatches(): Promise<Dispatch[]> {
    // 현재 서울 시간을 UTC로 변환
    const nowInSeoul = new Date();
    const nowInUTC = fromZonedTime(nowInSeoul, 'Asia/Seoul');

    const dispatches = await this.dispatchRepository.find({
      where: {
        scheduledAt: LessThan(nowInUTC),
        status: SendStatus.SCHEDULED,
      },
      relations: ['newsletter'],
      order: { scheduledAt: 'DESC' },
    });

    return dispatches;
  }

  //? ---------------------------------------------------------------------- ?//
  //? PUBLIC METHODS FOR CRON JOBS
  //? ---------------------------------------------------------------------- ?//

  async handleSendingNewsletter(dispatch: Dispatch): Promise<void> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      await this._handleSendingNewsletter(dispatch, manager);
    });
  }

  async handleResendingNewsletter(dispatch: Dispatch): Promise<void> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      await this._handleResendingNewsletter(dispatch, manager);
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateNewsletterDto): Promise<Newsletter> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 업데이트할 데이터로 preload
      const newsletter = await this.newsletterRepository.preload({
        id,
        ...dto,
      });
      if (!newsletter) {
        throw new NotFoundException('Newsletter not found');
      }
      // 저장
      return await manager.save(newsletter);
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

  async delete(id: number): Promise<Newsletter> {
    const newsletter = await this.findById(id);
    await this._deleteShortlinks(newsletter);
    await this._deleteDispatches(newsletter);
    return await this.newsletterRepository.softRemove(newsletter);
  }

  //? 예약된 뉴스레터 처리 (Dispatch 기반)
  private async _handleSendingNewsletter(
    dispatch: Dispatch,
    manager: EntityManager,
  ): Promise<void> {
    console.log(`✳️ handleSendingNewsletter`, dispatch);

    try {
      const students = await this._getStudents(manager, dispatch);
      const studentIds = students.map((student) => student.id);
      const dedupedStudents = this._dedupeStudents(students);

      // 숏링크 생성
      const shortlinks = await this._createShortlinks(
        manager,
        dispatch.newsletter,
        dedupedStudents,
      );

      // dispatch 업데이트
      const payload = this._buildNotificationPayload(
        dispatch.newsletter,
        shortlinks,
        dedupedStudents,
      );

      console.log(`✳️ payload`, JSON.stringify(payload, null, 2));

      dispatch.payload = payload;
      dispatch.studentIds = studentIds;
      await manager.save(dispatch);

      // newsletter 상태 업데이트
      dispatch.status = SendStatus.SCHEDULED;
      await manager.save(dispatch.newsletter);

      await this.slack.sendMessage({
        channel: 'activity',
        text: `[API] 🟢 ${dispatch.newsletter.schoolName}에서 뉴스레터 발송 중\n- 이름:${dispatch.newsletter.title}\n- 분류:${translateNewsletterType(dispatch.newsletter.type)}\n- 대상:${translateNewsletterTarget(dispatch.target)} ${shortlinks.length}명`,
      });
    } catch (err) {
      this.logger.error(
        `❌ Failed to handle scheduled newsletter: ${err.message}`,
        err,
      );
    }
  }

  //? 예약된 뉴스레터 재발송 처리 (Dispatch 기반)
  private async _handleResendingNewsletter(
    dispatch: Dispatch,
    manager: EntityManager,
  ): Promise<void> {
    console.log(`✳️ handleResendingNewsletter`, dispatch);

    try {
      // 안읽은 숏링크
      const shortlinks = await this.fetchUnreadShortlinks(
        manager,
        dispatch.newsletter,
      );

      // dispatch 업데이트
      dispatch.payload = this.rebuildNotificationPayload(
        dispatch.newsletter,
        shortlinks,
      );
      await manager.save(dispatch);

      await this.slack.sendMessage({
        channel: 'activity',
        text: `[API] 🟢 ${dispatch.newsletter.schoolName}에서 뉴스레터 재발송 중\n- 이름:${dispatch.newsletter.title}\n- 분류:${translateNewsletterType(dispatch.newsletter.type)}\n- 대상:${translateNewsletterTarget(dispatch.target)} ${shortlinks.length}명`,
      });
    } catch (err) {
      this.logger.error(
        `❌ Failed to handle resending newsletter: ${err.message}`,
        err,
      );
    }
  }

  //? dispatch.target 으로 학생 정보 리턴
  private async _getStudents(
    manager: EntityManager,
    dispatch: Dispatch,
  ): Promise<Student[]> {
    let students: Student[] = [];

    if (dispatch.target === NewsletterTarget.SCHOOL) {
      students = await manager.find(Student, {
        where: { schoolId: dispatch.newsletter.schoolId },
        relations: { parent: { user: true } },
      });
    } else if (dispatch.target === NewsletterTarget.GRADE) {
      if (!dispatch.targetItems || dispatch.targetItems.length === 0) {
        throw new BadRequestException('발송 대상 학년 정보가 없습니다.');
      }
      students = await manager.find(Student, {
        where: { grade: In(dispatch.targetItems) },
        relations: { parent: { user: true } },
      });
    } else if (dispatch.target === NewsletterTarget.LESSON) {
      if (!dispatch.targetItems || dispatch.targetItems.length === 0) {
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
          lessonIds: dispatch.targetItems,
        })
        .getMany();
    } else if (dispatch.target === NewsletterTarget.GROUP) {
      if (!dispatch.targetItems || dispatch.targetItems.length === 0) {
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
          groupIds: dispatch.targetItems,
        })
        .getMany();
    } else {
      if (!dispatch.targetItems || dispatch.targetItems.length === 0) {
        throw new BadRequestException('발송 대상 학생 정보가 없습니다.');
      }
      students = await manager.find(Student, {
        where: { id: In(dispatch.targetItems) },
        relations: { parent: { user: true } },
      });
    }

    // 전학생 제외 필터링
    students = students.filter(
      (student) => student.status === StudentStatus.ATTENDING,
    );

    return students;
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

  private async _deleteShortlinks(newsletter: Newsletter): Promise<void> {
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

  private async _deleteDispatches(newsletter: Newsletter): Promise<void> {
    try {
      await this.dataSource
        .getRepository(Dispatch)
        .delete({ newsletterId: newsletter.id });
    } catch (err) {
      this.logger.error(
        `❌ Failed to delete dispatches for newsletter ${newsletter.id}: ${err.message}`,
        err,
      );
    }
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

  //? sendNewsletter
  //? ---------------------------------------------------------------------- ?//
  //? Private Methods
  //? ---------------------------------------------------------------------- ?//

  private async _checkSchoolValidity(schoolId: number): Promise<School> {
    const school = await this.schoolRepository.findOne({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('⚠️ School not found');
    }
    return school;
  }

  private async _checkTermValidity(termId: number): Promise<Term> {
    const term = await this.termRepository.findOne({ where: { id: termId } });
    if (!term) {
      throw new NotFoundException('⚠️ Term not found');
    }
    return term;
  }

  private async _checkNewsletterValidity(dto: CreateNewsletterDto) {
    const newsletter = await this.newsletterRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        termId: dto.termId,
        type: NewsletterType.REGISTRATION,
      },
    });
    if (dto.type === NewsletterType.REGISTRATION && newsletter) {
      throw new BadRequestException(
        '❌ Registration newsletter already exists',
      );
    }
    return newsletter;
  }

  private async _isRegistrationNewsletterAlreadySentOrScheduled(
    schoolId: number,
    termId: number,
  ): Promise<void> {
    // 직접 dispatch 테이블에서 조회하여 불필요한 relation 로딩 방지
    const dispatchCount = await this.dataSource
      .getRepository(Dispatch)
      .createQueryBuilder('dispatch')
      .innerJoin('dispatch.newsletter', 'newsletter')
      .where('newsletter.schoolId = :schoolId', { schoolId })
      .andWhere('newsletter.termId = :termId', { termId })
      .andWhere('newsletter.type = :type', {
        type: NewsletterType.REGISTRATION,
      })
      .andWhere('dispatch.status IN (:...statuses)', {
        statuses: [SendStatus.SCHEDULED, SendStatus.SENT],
      })
      .getCount();

    if (dispatchCount > 0) {
      throw new BadRequestException(
        '⚠️ Registration newsletter already sent or scheduled.',
      );
    }
  }

  //? with target/targetItems combo, get the target students and label
  private async _getTargetStudents(
    manager: EntityManager,
    schoolId: number,
    target: NewsletterTarget,
    targetItems: number[],
  ): Promise<{ students: Student[]; label: string }> {
    let students: Student[] = []; //! student must have parent key exists
    let label: string = '';

    if (target === NewsletterTarget.SCHOOL) {
      students = await manager.find(Student, {
        where: { schoolId },
        relations: { parent: { user: true } },
      });
      label = '전교생';
    } else if (target === NewsletterTarget.GRADE) {
      if (!targetItems) {
        throw new BadRequestException('발송 대상 학년 정보가 없습니다.');
      }
      students = await manager.find(Student, {
        where: {
          schoolId,
          grade: In(targetItems),
        },
        relations: { parent: { user: true } },
      });
      label = `${targetItems.map((item) => `${item}`).join('·')}학년 학생`;
    } else if (target === NewsletterTarget.LESSON) {
      // 강좌
      if (!targetItems) {
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
          lessonIds: targetItems,
        })
        .getMany();
      const lessons = await manager
        .createQueryBuilder(Lesson, 'lesson')
        .where('lesson.id IN (:...lessonIds)', {
          lessonIds: targetItems,
        })
        .getMany();
      label = `${lessons.map((lesson) => lesson.lessonName).join('·')} 수강생`;
    } else if (target === NewsletterTarget.GROUP) {
      // 반
      if (!targetItems) {
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
          groupIds: targetItems,
        })
        .getMany();
      const groups = await manager
        .createQueryBuilder(Group, 'group')
        .where('group.id IN (:...groupIds)', {
          groupIds: targetItems,
        })
        .getMany();
      label = `${groups.map((group) => group.groupName).join('·')} 수강생`;
    } else {
      // 학생
      if (!targetItems) {
        throw new BadRequestException('발송 대상 학생 정보가 없습니다.');
      }
      students = await manager.find(Student, {
        where: { id: In(targetItems) },
        relations: { parent: { user: true } },
      });
      label = `${targetItems.length}명 학생`;
    }

    // TRANSFERRED 제외 필터링
    students = students.filter(
      (student) => student.status === StudentStatus.ATTENDING,
    );

    return { students, label };
  }

  //? student must have parent key exists
  private _dedupeStudents(students: Student[]): Student[] {
    const parentIdMap = new Map<number, Student>();
    students.forEach((student) => {
      if (!parentIdMap.has(student.parent.id)) {
        parentIdMap.set(student.parent.id, student);
      }
    });
    return Array.from(parentIdMap.values());
  }

  //? 각 학생별 newsletter 로의 숏링크 생성
  private async _createShortlinks(
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
        uri: `https://app.schoolhub.co.kr/${getMobileRoute(newsletter)}`,
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
            ['nanoid', 'uri', 'page', 'args'],
            ['parentId', 'newsletterId'],
          )
          .execute();
      } catch (error) {
        this.logger.error(`Failed to upsert Shortlinks: ${error.message}`);
        throw new InternalServerErrorException('숏링크 생성에 실패했습니다.');
      }
    }

    // 생성된 shortlinks 조회하여 반환
    return await manager.find(Shortlink, {
      where: { newsletterId: newsletter.id },
      relations: { parent: true, newsletter: true },
    });
  }

  //? 숏링크를 포함하는 notification payload 생성
  private _buildNotificationPayload(
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
}
