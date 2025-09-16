import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { fromZonedTime } from 'date-fns-tz';
import { nanoid } from 'nanoid';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
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
  getTemplateOfNewsChanges,
  getTemplateOfNewsSchedules,
  getTemplateOfNewsSupplies,
  getTemplateOfRegistration,
} from 'src/helpers/get-message-body';
import { getMobileRoute } from 'src/helpers/uri';
import { NotificationService } from 'src/services/notification/notification.service';
import {
  NotificationCoreData,
  NotificationFullData,
} from 'src/services/notification/types';
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
    private readonly notificationService: NotificationService,
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
    const school = await this._checkSchoolValidity(dto.schoolId);
    const term = await this._checkTermValidity(dto.termId);
    // upsert를 사용하므로 중복 체크 제거
    await this._checkNewsletterValidity(dto);
    let title: string;

    if (dto.type === NewsletterType.REGISTRATION) {
      title = `[${school.name}] ${term.termName} 수강신청 바로가기`;
    } else {
      title = dto.title || `[${school.name}] ${term.termName} 공지사항`;
    }
    await this.newsletterRepository.save(
      this.newsletterRepository.create({
        schoolId: dto.schoolId,
        termId: dto.termId,
        schoolName: school.name,
        termName: term.termName,
        title: title,
        body: dto.body || null,
        images: dto.images || null,
      }),
    );
    const newsletter = await this.newsletterRepository.findOneOrFail({
      where: { schoolId: dto.schoolId, termId: dto.termId },
    });

    if (dto.target && dto.targetItems) {
      // 1. Dispatch 생성 및 저장 (Subscriber가 자동으로 shortlinks 처리)
      const dispatch = this.dispatchRepository.create({
        ...dto,
        status: SendStatus.SCHEDULED,
        scheduledAt: dto.scheduledAt ?? fromZonedTime(new Date(), 'Asia/Seoul'),
        termId: dto.termId,
        newsletterId: newsletter.id,
      });

      const { students, label } = await this._getTargetStudents(
        this.dataSource.manager,
        newsletter.schoolId,
        dto.target,
        dto.targetItems,
      );
      const dedupedStudents = this._dedupeStudents(students);
      const studentIds = dedupedStudents.map((student) => student.id);
      dispatch.studentIds = studentIds;
      dispatch.targetLabel = label;

      // Dispatch 저장 (Subscriber가 백그라운드에서 shortlinks 생성 및 payload 업데이트)
      await this.dispatchRepository.save(dispatch);
    }

    return newsletter;
  }

  async sendNewsletter(id: number, dto: CreateDispatchDto): Promise<Dispatch> {
    // transaction 밖에서 validation 처리 (Auto-increment ID 낭비 방지)
    const newsletter = await this.findById(id, ['dispatches', 'shortlinks']);
    if (!newsletter.term.bookingStart) {
      throw new BadRequestException('❌ Missing bookingStart info in term');
    }
    if (!dto.target || !dto.targetItems) {
      throw new BadRequestException('❌ Missing target or targetItems');
    }
    await this._isRegistrationNewsletterAlreadySentOrScheduled(
      newsletter.schoolId,
      newsletter.termId,
    );

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const dispatch = manager.create(Dispatch, { ...dto });
      const term = newsletter.term;
      const { students, label } = await this._getTargetStudents(
        manager,
        newsletter.schoolId,
        dto.target!,
        dto.targetItems!,
      );
      const dedupedStudents = this._dedupeStudents(students);
      const studentIds = dedupedStudents.map((student) => student.id);
      dispatch.studentIds = studentIds;
      dispatch.targetLabel = label;
      // 숏링크 생성
      const shortlinks = await this._createShortlinks(
        manager,
        newsletter,
        dedupedStudents,
        dispatch.id,
      );
      const payload = this._buildNotificationFullData(
        term,
        newsletter,
        shortlinks,
        dedupedStudents,
      );
      dispatch.payload = payload;
      return await manager.save(dispatch);
    });
  }

  async resendNewsletter(id: number, dispatchId?: number): Promise<void> {
    const newsletter = await this.findById(id, [
      'term',
      'dispatches',
      'shortlinks',
      'shortlinks.parent',
      'shortlinks.parent.user',
    ]);
    if (!newsletter.dispatches || newsletter.dispatches.length < 1) {
      throw new UnprocessableEntityException('never sent out');
    }

    let dispatch: Dispatch;
    let shortlinks: Shortlink[];
    if (dispatchId) {
      dispatch = newsletter.dispatches.find(
        (dispatch) => dispatch?.id === dispatchId,
      )!;
      if (!dispatch) {
        throw new NotFoundException('Dispatch not found');
      }
      if (dispatch.status === SendStatus.SCHEDULED) {
        throw new UnprocessableEntityException(`wait until it's sent out`);
      }
      shortlinks = dispatch.shortlinks;
    } else {
      if (
        newsletter.dispatches.some(
          (dispatch) => dispatch.status === SendStatus.SCHEDULED,
        )
      ) {
        throw new UnprocessableEntityException(`wait until it's sent out`);
      }
      shortlinks = newsletter.shortlinks;
    }

    const unreadShortlinks = shortlinks.filter((v) => !v.isRead);
    if (unreadShortlinks.length === 0) {
      throw new UnprocessableEntityException('everyone has read');
    }

    // payload 재구성
    const payload: NotificationFullData =
      this._buildNotificationFullDataWithUnreadShortlinks(
        newsletter,
        unreadShortlinks,
      );

    console.log(`😳😳😳`, JSON.stringify(payload, null, 2));

    await this.notificationService.sendViaQueue(payload);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findRegistrationNewsletter(
    schoolId: number,
    termId: number,
  ): Promise<any> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { schoolId, termId },
      relations: ['dispatches'],
      order: { id: 'DESC' },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }
    let scheduledAt: Date | null = null;
    let status: SendStatus | null = null;

    if (newsletter.dispatches && newsletter.dispatches.length > 0) {
      scheduledAt = newsletter.dispatches[0].scheduledAt;
      status = newsletter.dispatches[0].status;
    }

    delete (newsletter as any).dispatches;

    return { ...newsletter, scheduledAt, status } as any;
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

  async findDetailById(newsletterId: number): Promise<Newsletter> {
    const newsletter: Newsletter =
      await this.newsletterRepository.findOneOrFail({
        where: { id: newsletterId },
        relations: ['dispatches'], // shortlinks 제거하여 성능 개선
      });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    return newsletter;
  }

  async findReadStats(
    newsletterId: number,
    dispatchId?: number,
  ): Promise<ReadStatDto[]> {
    // 1. 발송된 학생 ID들을 조회 (MySQL 호환)
    const dispatches = await this.dataSource.getRepository(Dispatch).find({
      where: dispatchId ? { newsletterId, id: dispatchId } : { newsletterId },
      select: ['studentIds'],
    });

    if (dispatches.length === 0) {
      return [];
    }

    const termId = dispatches[0].termId;
    // 모든 dispatch의 studentIds를 하나의 배열로 합치고 중복 제거
    const studentIds = Array.from(
      new Set(dispatches.flatMap((dispatch) => dispatch.studentIds)),
    );

    // 2. 최적화된 쿼리로 학생 정보와 읽음 상태를 한번에 조회
    const results = await this.dataSource
      .getRepository(Student)
      .createQueryBuilder('student')
      .leftJoin('student.parent', 'parent')
      .leftJoin(
        'parent.shortlinks',
        'shortlinks',
        'shortlinks.newsletterId = :newsletterId',
        { newsletterId },
      )
      .select([
        'student.id',
        'student.name',
        'student.grade',
        'student.class',
        'student.studentCode',
        'shortlinks.isRead',
        'shortlinks.nanoid',
        'shortlinks.url',
        'shortlinks.createdAt',
      ])
      .where('student.id IN (:...studentIds)', { studentIds })
      .getRawMany();

    // 3. 결과를 ReadStatDto 형태로 변환
    return results.map((row) => ({
      id: row.student_id,
      name: row.student_name,
      grade: row.student_grade,
      class: row.student_class,
      studentCode: row.student_studentCode,
      link: row.shortlinks_url
        ? `https://app.schoolhub.co.kr${row.shortlinks_url}`
        : `https://app.schoolhub.co.kr/parent/nanoid/${row.shortlinks_nanoid}?type=REGISTRATION&termId=${termId}&studentId=${row.student_id}`,
      read: row.shortlinks_isRead || false,
      createdAt: row.shortlinks_createdAt || new Date(),
    }));
  }

  async findReadStatsPaginated(
    newsletterId: number,
    query: PaginateQuery,
  ): Promise<Paginated<ReadStatDto>> {
    // 1. 발송된 학생 ID들을 조회 (MySQL 호환)
    const dispatches = await this.dataSource.getRepository(Dispatch).find({
      where: { newsletterId },
      select: ['studentIds', 'termId'],
    });

    if (dispatches.length === 0) {
      return {
        data: [],
        meta: {
          itemsPerPage: query.limit || 20,
          totalItems: 0,
          currentPage: query.page || 1,
          totalPages: 0,
          sortBy: (query.sortBy || []) as any,
          searchBy: (query.searchBy || []) as any,
          search: query.search || '',
          select: query.select || [],
          filter: query.filter || {},
        },
        links: {
          first: '',
          previous: '',
          current: '',
          next: '',
          last: '',
        },
      };
    }

    // const termId = dispatches[0].termId;
    const studentIds = Array.from(
      new Set(dispatches.flatMap((dispatch) => dispatch.studentIds)),
    );

    // 2. QueryBuilder 구성 후 paginateRaw로 페이지네이션 처리
    const qb = this.dataSource
      .getRepository(Student)
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect(
        'parent.shortlinks',
        'shortlinks',
        'shortlinks.newsletterId = :newsletterId',
        { newsletterId },
      )
      .where('student.id IN (:...studentIds)', { studentIds })
      .orderBy('student.id', 'ASC');

    const paged = await paginate<any>(query, qb, {
      defaultLimit: 20,
      maxLimit: 100,
      sortableColumns: [
        'student.id',
        'student.name',
        'student.grade',
        'student.class',
        'student.studentCode',
        'shortlinks.createdAt',
        'shortlinks.isRead',
      ],
      defaultSortBy: [['student.id', 'ASC']],
    });

    const data = paged.data.map((student: any) => {
      const sl = student.parent?.shortlinks?.[0];
      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        class: student.class,
        studentCode: student.studentCode,
        link: `https://app.schoolhub.co.kr${sl?.url}`,
        read: sl?.isRead ?? false,
        createdAt: sl?.createdAt ?? new Date(),
      };
    });

    return {
      data,
      meta: paged.meta as any,
      links: paged.links,
    };
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
    dispatchId: number,
  ): Promise<Shortlink[]> {
    const dtos: CreateShortlinkDto[] = [];

    for (const student of students) {
      const randomId = nanoid();
      const routes = JSON.stringify({
        type:
          newsletter.type === NewsletterType.REGISTRATION
            ? 'REGISTRATION'
            : 'NOTIFICATION',
        termId: newsletter.termId,
        studentId: student.id,
      });
      const dto: CreateShortlinkDto = {
        parentId: student.parent.id,
        newsletterId: newsletter.id,
        dispatchId: dispatchId,
        nanoid: randomId,
        role: 'PARENT',
        url: getMobileRoute(
          newsletter.type,
          newsletter.termId,
          randomId,
          student.id,
        ), // 이미 전체 URL을 반환하므로 중복 제거
        routes: routes,
      };
      dtos.push(dto);
    }

    const batches = chunk(dtos, 500);
    this.logger.debug(`Total DTOs: ${dtos.length}, Batches: ${batches.length}`);

    // a compound unique key constraint with parentId and newsletterId
    for (const batch of batches) {
      try {
        this.logger.debug(`Processing batch with ${batch.length} items`);

        // TypeORM createQueryBuilder를 사용한 안전한 upsert
        for (const dto of batch) {
          const result = await manager
            .createQueryBuilder()
            .insert()
            .into(Shortlink)
            .values({
              parentId: dto.parentId,
              newsletterId: dto.newsletterId,
              dispatchId: dto.dispatchId,
              nanoid: dto.nanoid,
              role: dto.role,
              url: dto.url,
              routes: dto.routes || '{}',
            })
            .orUpdate(
              ['dispatchId', 'nanoid', 'role', 'url', 'routes'],
              ['parentId', 'newsletterId'],
            )
            .execute();

          this.logger.debug(`Upsert result: ${JSON.stringify(result)}`);
        }
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
  private _buildNotificationFullData(
    term: Term,
    newsletter: Newsletter,
    shortlinks: Shortlink[],
    students: Student[],
  ) {
    let body: string;
    const messages = students.map((student: Student) => {
      const shortlink = shortlinks.find(
        (shortlink) => shortlink.parentId === student.parent.id,
      );

      switch (newsletter.type) {
        case NewsletterType.REGISTRATION:
          body = getTemplateOfRegistration({
            school: newsletter.schoolName,
            term: newsletter.termName,
            period: term.bookingPeriod,
            shortlink: `${this.domain}/${shortlink?.nanoid}`,
          });
          break;
        case NewsletterType.CHANGES:
          body = getTemplateOfNewsChanges({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 변동사항',
            shortlink: `${this.domain}/${shortlink?.nanoid}`,
          });
          break;
        case NewsletterType.SCHEDULES:
          body = getTemplateOfNewsSchedules({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 준비물',
            shortlink: `${this.domain}/${shortlink?.nanoid}`,
          });
          break;
        case NewsletterType.SUPPLIES:
          body = getTemplateOfNewsSupplies({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 일정변경',
            shortlink: `${this.domain}/${shortlink?.nanoid}`,
          });
          break;
        default:
          body = '';
          break;
      }
      return {
        token: student.parent?.user?.pushToken ?? null,
        phone: student.parent.phone,
        template: this._getTemplateName(newsletter.type),
        body: body,
        role: 'PARENT',
        url: shortlink?.url,
        routes: shortlink?.routes,
      };
    });

    return {
      type: newsletter.type as string,
      schoolId: newsletter.schoolId,
      messages: messages,
    };
  }

  //? 숏링크를 포함하는 notification payload 생성
  private _buildNotificationFullDataWithUnreadShortlinks(
    newsletter: Newsletter,
    shortlinks: Shortlink[],
  ): NotificationFullData {
    let body: string;
    const messages = shortlinks.map((v: Shortlink) => {
      switch (newsletter.type) {
        case NewsletterType.REGISTRATION:
          body = getTemplateOfRegistration({
            school: newsletter.schoolName,
            term: newsletter.termName,
            period: newsletter.term.bookingPeriod,
            shortlink: `${this.domain}/${v?.nanoid}`,
          });
          break;
        case NewsletterType.CHANGES:
          body = getTemplateOfNewsChanges({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 변동사항',
            shortlink: `${this.domain}/${v?.nanoid}`,
          });
          break;
        case NewsletterType.SCHEDULES:
          body = getTemplateOfNewsSchedules({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 준비물',
            shortlink: `${this.domain}/${v?.nanoid}`,
          });
          break;
        case NewsletterType.SUPPLIES:
          body = getTemplateOfNewsSupplies({
            school: newsletter.schoolName,
            term: newsletter.termName,
            title: newsletter.title || '수업 일정변경',
            shortlink: `${this.domain}/${v?.nanoid}`,
          });
          break;
        default:
          body = '';
          break;
      }
      return {
        token: v.parent?.user?.pushToken ?? null,
        phone: v.parent.phone ?? null,
        template: this._getTemplateName(newsletter.type),
        body: body,
        role: v.role,
        url: v.url,
        routes: v.routes,
      } as unknown as NotificationCoreData;
    });

    return {
      type: newsletter.type,
      schoolId: newsletter.schoolId,
      messages: messages,
    };
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

  private _getTemplateName(type: NewsletterType) {
    switch (type) {
      case NewsletterType.REGISTRATION:
        return 'Registration1';
      case NewsletterType.CHANGES:
        return 'NewsChange1';
      case NewsletterType.SCHEDULES:
        return 'NewsSchedule1';
      case NewsletterType.SUPPLIES:
        return 'NewsSupplies1';
      default:
        return 'Unknown';
    }
  }
}
