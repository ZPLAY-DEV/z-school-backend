import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import {
  NewsletterTarget,
  NewsletterType,
  StudentStatus,
} from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { ReadStatDto } from 'src/domain/newsletter/dto/read-stat.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Shortlink } from 'src/domain/newsletter/entities/shortlink.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
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

  //? 발송을 원한다면, dto.status 를 SCHEDULED 로 지정하라.
  async createNewsletter(dto: CreateNewsletterDto): Promise<Newsletter> {
    const school = await this._checkSchoolValidity(dto.schoolId);
    const term = await this._checkTermValidity(dto.termId);
    // upsert를 사용하므로 중복 체크 제거
    await this._checkNewsletterValidity(dto);
    let title: string;
    let studentIds: number[] | null = null;
    let targetLabel: string | null = null;

    if (dto.type === NewsletterType.REGISTRATION) {
      title =
        dto.title || `[${school.name}] ${term.termName} 수강신청 바로가기`;
    } else {
      title = dto.title || `[${school.name}] ${term.termName} 공지사항`;
    }

    if (dto.target && dto.targetItems) {
      const { students, label } = await this._getTargetStudents(
        this.dataSource.manager,
        dto.schoolId,
        dto.target,
        dto.targetItems,
      );
      const dedupedStudents = this._dedupeStudents(students);
      studentIds = dedupedStudents.map((student) => student.id);
      targetLabel = label;
    }

    const newsletter = await this.newsletterRepository.save(
      this.newsletterRepository.create({
        schoolId: dto.schoolId,
        termId: dto.termId,
        schoolName: school.name,
        termName: term.termName,
        title: title,
        body: dto.body || null,
        images: dto.images || null,
        type: dto.type,
        studentIds: studentIds,
        target: dto.target || null,
        targetItems: dto.targetItems || null,
        targetLabel: targetLabel,
        scheduledAt: dto.scheduledAt || null,
        rescheduledAt: dto.rescheduledAt || null,
        status: dto.status || SendStatus.INIT,
      }),
    );

    return newsletter;
  }

  async sendNewsletter(
    id: number,
    dto: {
      target: NewsletterTarget;
      targetItems: number[];
      scheduledAt: string;
      status: SendStatus;
    },
  ): Promise<Newsletter> {
    const newsletter = await this.findById(id, ['term']);
    if (!newsletter.term.bookingStart) {
      throw new BadRequestException('학기의 수강신청기간을 먼저 설정하세요.');
    }
    if (newsletter.status === SendStatus.SENT) {
      throw new BadRequestException('이미 발송했습니다.');
    }
    if (newsletter.status === SendStatus.SCHEDULED && newsletter.scheduledAt) {
      throw new BadRequestException(
        `이미 발송예약중입니다. @${formatInTimeZone(newsletter.scheduledAt, 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}`,
      );
    }

    if (dto.target && dto.targetItems) {
      const { students, label } = await this._getTargetStudents(
        this.dataSource.manager,
        newsletter.schoolId,
        dto.target,
        dto.targetItems,
      );
      const dedupedStudents = this._dedupeStudents(students);
      newsletter.target = dto.target;
      newsletter.targetItems = dto.targetItems;
      newsletter.targetLabel = label;
      newsletter.studentIds = dedupedStudents.map((student) => student.id);
      newsletter.scheduledAt = new Date(dto.scheduledAt);
      newsletter.status = dto.status;
    }
    return await this.newsletterRepository.save(newsletter);
  }

  async resendNewsletter(id: number): Promise<void> {
    const newsletter = await this.findById(id, ['shortlinks']);
    if (newsletter.status !== SendStatus.SENT) {
      throw new BadRequestException('발송 후 다시 시도하세요.');
    }
    if (newsletter.rescheduledAt) {
      throw new BadRequestException(`이미 재발송 하였습니다.`);
    }

    const unreadShortlinks = newsletter.shortlinks.filter((v) => !v.isRead);
    if (unreadShortlinks.length === 0) {
      throw new UnprocessableEntityException('everyone has read');
    }

    // payload 재구성
    const data: NotificationFullData =
      this._buildNotificationCoreDataFromUnreadShortlinks(
        newsletter,
        unreadShortlinks,
      );
    await this.notificationService.sendViaQueue(data);

    // rescheduledAt을 현재 시각으로 업데이트
    await this.newsletterRepository.update(id, {
      rescheduledAt: new Date(),
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findRegistrationNewsletter(
    schoolId: number,
    termId: number,
  ): Promise<Newsletter> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { schoolId, termId },
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

  async findReadStats(newsletterId: number): Promise<ReadStatDto[]> {
    const newsletter = await this.newsletterRepository.findOne({
      where: { id: newsletterId },
      relations: { shortlinks: true },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

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
        'shortlinks.routes',
        'shortlinks.createdAt',
      ])
      .where('student.id IN (:...studentIds)', {
        studentIds: newsletter.studentIds,
      })
      .getRawMany();

    // 3. 결과를 ReadStatDto 형태로 변환
    return results.map((row) => ({
      id: row.student_id,
      name: row.student_name,
      grade: row.student_grade,
      class: row.student_class,
      studentCode: row.student_studentCode,
      link: `${this.domain}/${row.shortlinks_nanoid}`,
      read: row.shortlinks_isRead || false,
      createdAt: row.shortlinks_createdAt || new Date(),
    }));
  }

  async findReadStatsPaginated(
    newsletterId: number,
    query: PaginateQuery,
  ): Promise<Paginated<ReadStatDto>> {
    // 1. 발송된 학생 ID들을 조회
    const newsletter = await this.newsletterRepository.findOne({
      where: { id: newsletterId },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    // 2. QueryBuilder 구성 후 paginate로 페이지네이션 처리
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
      .where('student.id IN (:...studentIds)', {
        studentIds: newsletter.studentIds,
      })
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

    // 3. 결과를 ReadStatDto 형태로 변환
    // this is the only way to get it done so far.
    const data = paged.data.map((student: any) => {
      const shortlink = student.parent?.shortlinks?.[0];
      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        class: student.class,
        studentCode: student.studentCode,
        link: shortlink?.nanoid ? `${this.domain}/${shortlink.nanoid}` : null,
        read: shortlink?.isRead ?? false,
        createdAt: shortlink?.createdAt ?? new Date(),
      };
    });

    return {
      data,
      meta: paged.meta as any,
      links: paged.links,
    };
  }

  async findPendingItems(): Promise<Newsletter[]> {
    // 현재 서울 시간을 UTC로 변환
    const nowInSeoul = new Date();
    const nowInUTC = fromZonedTime(nowInSeoul, 'Asia/Seoul');

    return await this.newsletterRepository.find({
      where: {
        scheduledAt: LessThan(nowInUTC),
        status: SendStatus.SCHEDULED,
      },
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
    await this._deleteShortlinks(newsletter.id);
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

  private async _deleteShortlinks(newsletterId: number): Promise<void> {
    try {
      await this.dataSource
        .getRepository(Shortlink)
        .delete({ newsletterId: newsletterId });
    } catch (err) {
      this.logger.error(
        `❌ Failed to delete shortlinks for newsletter ${newsletterId}: ${err.message}`,
        err,
      );
    }
  }

  private _buildNotificationCoreDataFromUnreadShortlinks(
    newsletter: Newsletter,
    unreadShortlinks: Shortlink[],
  ): NotificationFullData {
    const messages: NotificationCoreData[] = unreadShortlinks.map(
      (v) => v.payload,
    );

    return {
      type: newsletter.type,
      schoolId: newsletter.schoolId,
      messages,
    };
  }
}
