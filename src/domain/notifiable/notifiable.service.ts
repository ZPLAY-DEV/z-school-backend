import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import {
  NewsletterType,
  NotifiableSourceType,
  NotifiableTarget,
  SendStatus,
} from 'src/common/enums';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { CreateNotifiableDto } from 'src/domain/notifiable/dto/create-notifiable.dto';
import { NotifiableStatusItemDto } from 'src/domain/notifiable/dto/notifiable-status-item.dto';
import { UpdateNotifiableDto } from 'src/domain/notifiable/dto/update-notifiable.dto';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { chunk } from 'src/helpers/array';
import {
  getTemplateOfNewsManagement,
  getTemplateOfNewsRegistrationResult,
  getTemplateOfNewsSchedule,
  getTemplateOfNewsSupplies,
  getTemplateOfRegistration,
} from 'src/helpers/get-message-body';
import { NotificationCoreData } from 'src/services/notification/types';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';

@Injectable()
export class NotifiableService {
  private readonly logger = new Logger(NotifiableService.name);
  private readonly domain: string;

  constructor(
    @InjectRepository(Notifiable)
    private readonly notifiableRepository: Repository<Notifiable>,
    @InjectRepository(Recipient)
    private readonly recipientRepository: Repository<Recipient>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.domain =
      this.configService.get('nodeEnv') === 'prod'
        ? 'https://스쿨허브.kr'
        : 'https://dev.스쿨허브.kr';
  }

  //? ---------------------------------------------------------------------- ?//
  //? CREATE / SEND
  //? ---------------------------------------------------------------------- ?//

  /**
   * Notifiable 생성 (upsert)
   * - [schoolId, termId, type, title]이 동일한 레코드가 있으면 업데이트
   * - 없으면 새로 생성
   */
  async save(dto: CreateNotifiableDto): Promise<Notifiable> {
    // target이 있으면 학생 목록 조회
    let studentIds: number[] | null = null;
    if (dto.target) {
      const students = await this._getStudentsByTarget(
        dto.schoolId,
        dto.termId,
        dto.target,
        dto.targetItems,
      );
      studentIds = Array.from(new Set(students.map((s) => s.id)));
    }

    // 기존 notifiable 조회 (unique constraint 기준)
    const existing = await this.notifiableRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        termId: dto.termId,
        type: dto.type,
        title: dto.title,
      },
    });

    if (existing) {
      // 기존 레코드가 있으면 업데이트
      existing.status = dto.status || existing.status;
      existing.target = dto.target || existing.target;
      existing.targetItems = dto.targetItems || existing.targetItems;
      existing.targetLabel = dto.targetLabel || existing.targetLabel;
      existing.studentIds = studentIds || existing.studentIds;
      existing.scheduledAt = dto.scheduledAt || existing.scheduledAt;

      return await this.notifiableRepository.save(existing);
    }

    // 새로 생성
    const notifiable = this.notifiableRepository.create({
      schoolId: dto.schoolId,
      termId: dto.termId,
      type: dto.type,
      title: dto.title,
      message: null,
      status: dto.status || SendStatus.INIT,
      target: dto.target,
      targetItems: dto.targetItems || null,
      targetLabel: dto.targetLabel || null,
      studentIds: studentIds,
      scheduledAt: dto.scheduledAt || null,
    });

    return await this.notifiableRepository.save(notifiable);
  }

  /**
   * Notifiable 발송
   * - notifiableId로 지정된 Notifiable을 발송 예약
   * - _generateRecipients 생성 후 status를 INIT => SCHEDULED로 변경
   * - 실제 발송은 Queue Handler Lambda 함수가 처리
   */
  async send(notifiableId: number): Promise<Notifiable> {
    const notifiable = await this.findById(notifiableId, [
      'newsletter',
      'survey',
      'reminder',
    ]);

    // 이미 발송된 경우 예외 처리
    if (notifiable.status === SendStatus.SENT) {
      throw new BadRequestException('이미 발송된 알림입니다.');
    }

    // 발송 대상 학생 목록 조회
    const students = await this._getStudentsByTarget(
      notifiable.schoolId,
      notifiable.termId,
      notifiable.target,
      notifiable.targetItems || undefined,
    );

    if (students.length === 0) {
      throw new BadRequestException('발송 대상 학생이 없습니다.');
    }

    // 중복 제거된 학생 ID 목록
    const studentIds = Array.from(new Set(students.map((s) => s.id)));

    // studentIds 업데이트
    notifiable.studentIds = studentIds;

    // Recipients 생성
    await this._generateRecipients(notifiable);

    // status를 SCHEDULED로 변경
    notifiable.status = SendStatus.SCHEDULED;

    const savedNotifiable = await this.notifiableRepository.save(notifiable);

    return savedNotifiable;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  /**
   * 발송 대기 중인 Notifiable 조회
   * - 발송 예약 시간이 현재 시간보다 이전이고
   * - 발송 상태가 SCHEDULED인 Notifiable들을 조회합니다
   */
  async findPendingItems(): Promise<Notifiable[]> {
    const now = new Date();
    this.logger.log(`⏳ Finding pending dispatches at ${now.toISOString()}`);

    const notifiables = await this.notifiableRepository.find({
      where: {
        status: SendStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(now),
      },
      order: {
        scheduledAt: 'ASC',
      },
      relations: ['school', 'term'],
    });

    this.logger.log(`✅ Found ${notifiables.length} pending dispatches`);
    return notifiables;
  }

  /**
   * ID로 Notifiable 조회
   */
  async findById(id: number, relations?: string[]): Promise<Notifiable> {
    const notifiable = await this.notifiableRepository.findOne({
      where: { id },
      relations: relations,
    });

    if (!notifiable) {
      throw new NotFoundException('Notifiable not found');
    }

    return notifiable;
  }

  /**
   * Notifiable의 수신자 상태 목록 조회
   * - Newsletter, Survey, Reminder의 모든 수신자 상태를 조회합니다
   * - 읽음/답변 여부 등의 상태 정보를 포함합니다
   */
  async getNotifiableStatusItems(
    id: number,
  ): Promise<NotifiableStatusItemDto[]> {
    const notifiable = await this.findById(id, [
      'newsletter',
      'survey',
      'reminder',
    ]);

    // Recipient를 통해 Student와 함께 조회
    const recipients = await this.recipientRepository.find({
      where: {
        notifiableId: id,
      },
      relations: ['student'],
      order: {
        student: {
          grade: 'ASC',
          klass: 'ASC',
          bunho: 'ASC',
        },
      },
    });

    // 결과를 NotifiableStatusItemDto 형태로 변환
    return recipients.map((recipient) => ({
      id: recipient.student.id,
      name: recipient.student.name,
      grade: recipient.student.grade,
      class: recipient.student.klass,
      bunho: recipient.student.bunho,
      link: recipient.nanoid ? `${this.domain}/${recipient.nanoid}` : null,
      type: notifiable.type,
      readAt: recipient.readAt,
      answeredAt: recipient.answeredAt,
      createdAt: recipient.createdAt,
    }));
  }

  /**
   * Notifiable의 수신자 상태 목록 조회 (페이지네이션)
   * - nestjs-paginate를 사용한 효율적인 페이지네이션 지원
   * - 학생 이름 검색 및 학년별 필터링 지원
   */
  async getNotifiableStatusItemsPaginated(
    id: number,
    query: PaginateQuery,
  ): Promise<Paginated<NotifiableStatusItemDto>> {
    const notifiable = await this.findById(id, [
      'newsletter',
      'survey',
      'reminder',
    ]);

    // QueryBuilder로 페이지네이션 쿼리 구성
    const queryBuilder = this.recipientRepository
      .createQueryBuilder('recipient')
      .leftJoinAndSelect('recipient.student', 'student')
      .where('recipient.notifiableId = :notifiableId', { notifiableId: id })
      .orderBy('student.grade', 'ASC')
      .addOrderBy('student.klass', 'ASC')
      .addOrderBy('student.bunho', 'ASC');

    const paginatedResult = await paginate<Recipient>(query, queryBuilder, {
      relations: ['student'],
      sortableColumns: [
        'id',
        'student.grade',
        'student.klass',
        'student.bunho',
      ],
      searchableColumns: ['student.name'],
      defaultSortBy: [
        ['student.grade', 'ASC'],
        ['student.klass', 'ASC'],
        ['student.bunho', 'ASC'],
      ],
      filterableColumns: {
        'student.grade': [FilterOperator.EQ, FilterOperator.IN],
        'student.klass': [FilterOperator.EQ, FilterOperator.IN],
      },
    });

    // 결과를 NotifiableStatusItemDto로 변환
    const items: NotifiableStatusItemDto[] = paginatedResult.data.map(
      (recipient) => ({
        id: recipient.student.id,
        name: recipient.student.name,
        grade: recipient.student.grade,
        class: recipient.student.klass,
        bunho: recipient.student.bunho,
        link: recipient.nanoid ? `${this.domain}/${recipient.nanoid}` : null,
        type: notifiable.type,
        readAt: recipient.readAt,
        answeredAt: recipient.answeredAt,
        createdAt: recipient.createdAt,
      }),
    );

    return {
      data: items,
      meta: paginatedResult.meta as any,
      links: paginatedResult.links,
    };
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  /**
   * Notifiable 수정
   */
  async update(id: number, dto: UpdateNotifiableDto): Promise<Notifiable> {
    const notifiable = await this.findById(id);

    // DTO에서 제공된 필드만 업데이트
    if (dto.schoolId !== undefined) notifiable.schoolId = dto.schoolId;
    if (dto.termId !== undefined) notifiable.termId = dto.termId;
    if (dto.type !== undefined) notifiable.type = dto.type;
    if (dto.title !== undefined) notifiable.title = dto.title;
    if (dto.status !== undefined) notifiable.status = dto.status;
    if (dto.target !== undefined) notifiable.target = dto.target;
    if (dto.targetItems !== undefined) notifiable.targetItems = dto.targetItems;
    if (dto.targetLabel !== undefined) notifiable.targetLabel = dto.targetLabel;
    if (dto.scheduledAt !== undefined) notifiable.scheduledAt = dto.scheduledAt;

    // target이 변경되었거나 targetItems가 변경된 경우 studentIds 재계산
    if (dto.target !== undefined || dto.targetItems !== undefined) {
      const currentTarget =
        dto.target !== undefined ? dto.target : notifiable.target;
      const currentTargetItems =
        dto.targetItems !== undefined
          ? dto.targetItems
          : notifiable.targetItems;

      if (currentTarget) {
        const students = await this._getStudentsByTarget(
          notifiable.schoolId,
          notifiable.termId,
          currentTarget,
          currentTargetItems || undefined,
        );
        notifiable.studentIds = Array.from(new Set(students.map((s) => s.id)));
      }
    }

    return await this.notifiableRepository.save(notifiable);
  }

  /**
   * 상태를 발송으로 업데이트하는 helper 함수
   */
  async updateStatusToSent(id: number): Promise<Notifiable> {
    const notifiable = await this.findById(id);

    notifiable.status = SendStatus.SENT;
    notifiable.sentAt = new Date();

    return await this.notifiableRepository.save(notifiable);
  }

  /**
   * Notifiable 재발송
   * - 이미 발송된 Notifiable을 읽지 않은 수신자에게만 다시 발송합니다
   * - Newsletter, Survey, Reminder 모두에서 사용 가능
   */
  async resend(id: number): Promise<void> {
    const notifiable = await this.findById(id, [
      'newsletter',
      'survey',
      'reminder',
      'recipients',
    ]);

    // 발송 상태 확인
    if (notifiable.status !== SendStatus.SENT) {
      throw new BadRequestException('발송 후 다시 시도하세요.');
    }

    // 읽지 않은 수신자 조회 (readAt이 null인 경우)
    const unreadRecipients = await this.recipientRepository
      .createQueryBuilder('recipient')
      .leftJoinAndSelect('recipient.student', 'student')
      .leftJoinAndSelect('student.parent', 'parent')
      .where('recipient.notifiableId = :notifiableId', { notifiableId: id })
      .andWhere('recipient.readAt IS NULL')
      .getMany();

    if (unreadRecipients.length === 0) {
      throw new BadRequestException('모든 수신자가 이미 읽었습니다.');
    }

    this.logger.log(
      `📤 Resending notifiable ${id} to ${unreadRecipients.length} unread recipients`,
    );

    // TODO: 실제 재발송 로직 구현 필요
    // 1. unreadRecipients로부터 NotificationCoreData[] 생성
    // 2. NotificationFullData 구성
    // 3. NotificationService.send() 호출
    // 4. 발송 결과에 따라 Recipient 업데이트
    this.logger.warn(
      `⚠️ Resend logic needs to be implemented for ${unreadRecipients.length} recipients`,
    );

    // 재발송 시도 기록 (향후 sentAt 업데이트 등 필요시)
    // notifiable.rescheduledAt = new Date();
    // await this.notifiableRepository.save(notifiable);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  /**
   * Notifiable 소프트 삭제
   */
  async delete(id: number): Promise<Notifiable> {
    const notifiable = await this.findById(id);

    // Recipients 는 사전에 완전 제거
    await this.recipientRepository.delete({
      notifiableId: id,
    });

    return await this.notifiableRepository.softRemove(notifiable);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Methods
  //? ---------------------------------------------------------------------- ?//

  /**
   * 발송 대상에 따른 학생 목록 조회
   */
  private async _getStudentsByTarget(
    schoolId: number,
    termId: number,
    target: NotifiableTarget,
    targetItems?: number[],
  ): Promise<Student[]> {
    this.logger.debug(
      `🔍 Getting students for target: ${target}, items: ${JSON.stringify(targetItems)}`,
    );

    switch (target) {
      case NotifiableTarget.SCHOOL:
        // 학교 전체 학생 조회
        return await this._getStudentsBySchool(schoolId, termId);

      case NotifiableTarget.GRADE:
        // 학년별 학생 조회
        if (!targetItems || targetItems.length === 0) {
          throw new BadRequestException('학년 정보가 필요합니다.');
        }
        return await this._getStudentsByGrades(schoolId, termId, targetItems);

      case NotifiableTarget.LESSON:
        // 과목별 학생 조회
        if (!targetItems || targetItems.length === 0) {
          throw new BadRequestException('과목 정보가 필요합니다.');
        }
        return await this._getStudentsByLessons(termId, targetItems);

      case NotifiableTarget.GROUP:
        // 반별 학생 조회
        if (!targetItems || targetItems.length === 0) {
          throw new BadRequestException('반 정보가 필요합니다.');
        }
        return await this._getStudentsByGroups(targetItems);

      case NotifiableTarget.STUDENT:
        // 개별 학생 조회
        if (!targetItems || targetItems.length === 0) {
          throw new BadRequestException('학생 정보가 필요합니다.');
        }
        return await this._getStudentsByIds(targetItems);

      default:
        throw new BadRequestException('지원하지 않는 발송 대상입니다.');
    }
  }

  /**
   * 학교 전체 학생 조회 (해당 학기에 수강중인 학생)
   */
  private async _getStudentsBySchool(
    schoolId: number,
    termId: number,
  ): Promise<Student[]> {
    return await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.picks', 'pick')
      .innerJoin('pick.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin('lesson.term', 'term')
      .where('student.schoolId = :schoolId', { schoolId })
      .andWhere('term.id = :termId', { termId })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .distinct(true)
      .getMany();
  }

  /**
   * 학년별 학생 조회
   */
  private async _getStudentsByGrades(
    schoolId: number,
    termId: number,
    grades: number[],
  ): Promise<Student[]> {
    return await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.picks', 'pick')
      .innerJoin('pick.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin('lesson.term', 'term')
      .where('student.schoolId = :schoolId', { schoolId })
      .andWhere('term.id = :termId', { termId })
      .andWhere('student.grade IN (:...grades)', { grades })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .distinct(true)
      .getMany();
  }

  /**
   * 과목별 학생 조회
   */
  private async _getStudentsByLessons(
    termId: number,
    lessonIds: number[],
  ): Promise<Student[]> {
    return await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.picks', 'pick')
      .innerJoin('pick.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .where('lesson.termId = :termId', { termId })
      .andWhere('lesson.id IN (:...lessonIds)', { lessonIds })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .distinct(true)
      .getMany();
  }

  /**
   * 반별 학생 조회
   */
  private async _getStudentsByGroups(groupIds: number[]): Promise<Student[]> {
    return await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.picks', 'pick')
      .where('pick.groupId IN (:...groupIds)', { groupIds })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .distinct(true)
      .getMany();
  }

  /**
   * 개별 학생 조회
   */
  private async _getStudentsByIds(studentIds: number[]): Promise<Student[]> {
    return await this.studentRepository.find({
      where: {
        id: In(studentIds),
      },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Recipients Management
  //? ---------------------------------------------------------------------- ?//

  /**
   * Recipients 생성
   * - Notifiable의 studentIds를 기반으로 각 학생에게 보낼 개인화된 링크와 알림 데이터 생성
   * - Newsletter, Reminder, Survey 모든 타입 지원
   */
  private async _generateRecipients(notifiable: Notifiable): Promise<void> {
    this.logger.debug(
      `📝 Generating recipients for notifiable ${notifiable.id}`,
    );

    // 학생 정보 조회 - parent.user 관계도 포함하여 N+1 Query 방지
    const students = await this.studentRepository.find({
      where: { id: In(notifiable.studentIds || []) },
      relations: ['parent', 'parent.user'],
    });

    // Term 정보 조회
    const term = await this.dataSource.getRepository(Term).findOne({
      where: { id: notifiable.termId },
    });

    if (students.length === 0) {
      this.logger.warn(`No students found for notifiable ${notifiable.id}`);
      return;
    }

    if (!term) {
      this.logger.warn(`No term found for notifiable ${notifiable.id}`);
      return;
    }

    // Source entity 조회 (Newsletter, Reminder, Survey)
    let sourceEntity: Newsletter | Reminder | Survey | null = null;
    if (notifiable.type === NotifiableSourceType.NEWSLETTER) {
      sourceEntity = await this.dataSource.getRepository(Newsletter).findOne({
        where: { notifiableId: notifiable.id },
        relations: ['school', 'term'],
      });
    } else if (notifiable.type === NotifiableSourceType.REMINDER) {
      sourceEntity = await this.dataSource.getRepository(Reminder).findOne({
        where: { notifiableId: notifiable.id },
        relations: ['school', 'term'],
      });
    } else if (notifiable.type === NotifiableSourceType.SURVEY) {
      sourceEntity = await this.dataSource.getRepository(Survey).findOne({
        where: { notifiableId: notifiable.id },
        relations: ['school', 'term'],
      });
    }

    if (!sourceEntity) {
      this.logger.warn(
        `No source entity found for notifiable ${notifiable.id} (type: ${notifiable.type})`,
      );
      return;
    }

    // Recipients 생성
    await this._createRecipients(notifiable, term, sourceEntity, students);
  }

  /**
   * Recipients를 벌크로 생성 (upsert)
   * - 배치 INSERT로 성능 최적화
   * - Newsletter: parent 기준 dedup (다자녀 학부모는 1번만 수신)
   * - Reminder/Survey: student 기준 (학생별 개별 링크)
   */
  private async _createRecipients(
    notifiable: Notifiable,
    term: Term,
    sourceEntity: Newsletter | Reminder | Survey,
    students: Student[],
  ): Promise<void> {
    const recipients: Partial<Recipient>[] = [];

    // Newsletter는 parent 기준 dedup
    if (notifiable.type === NotifiableSourceType.NEWSLETTER) {
      // parentId 기준으로 dedup (다자녀 학부모는 첫 번째 자녀만 사용)
      const parentMap = new Map<number, Student>();
      for (const student of students) {
        if (!parentMap.has(student.parentId)) {
          parentMap.set(student.parentId, student);
        }
      }

      this.logger.debug(
        `📧 Newsletter: ${students.length} students → ${parentMap.size} unique parents`,
      );

      for (const [parentId, student] of parentMap.entries()) {
        const nanoId = nanoid();

        const context = {
          parentId: parentId,
          termId: notifiable.termId,
          type: (sourceEntity as Newsletter).type,
        };

        const recipient: Partial<Recipient> = {
          notifiableId: notifiable.id,
          studentId: student.id, // 대표 학생 (첫 번째 자녀)
          nanoid: nanoId,
          context: context,
          payload: this._buildNotificationCoreData(
            nanoId,
            student,
            term,
            notifiable,
            sourceEntity,
          ),
          sentAt: null,
          failedAt: null,
          readAt: null,
          answeredAt: null,
        };

        recipients.push(recipient);
      }
    } else {
      // Reminder, Survey는 학생 기준 (개별 링크)
      for (const student of students) {
        const nanoId = nanoid();

        const context = {
          studentId: student.id,
          termId: notifiable.termId,
        };

        const recipient: Partial<Recipient> = {
          notifiableId: notifiable.id,
          studentId: student.id,
          nanoid: nanoId,
          context: context,
          payload: this._buildNotificationCoreData(
            nanoId,
            student,
            term,
            notifiable,
            sourceEntity,
          ),
          sentAt: null,
          failedAt: null,
          readAt: null,
          answeredAt: null,
        };

        recipients.push(recipient);
      }
    }

    // 배치 INSERT 실행
    const batches = chunk(recipients, 500);
    this.logger.debug(
      `Total Recipients: ${recipients.length}, Batches: ${batches.length}`,
    );

    for (const batch of batches) {
      try {
        this.logger.debug(`Processing batch with ${batch.length} items`);
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(Recipient)
          .values(batch)
          .orUpdate(['nanoid', 'context'], ['notifiableId', 'studentId'])
          .execute();
      } catch (error) {
        this.logger.error(`Failed to upsert Recipients: ${error.message}`);
        throw new Error('수신자 정보 생성에 실패했습니다.');
      }
    }

    this.logger.log(
      `✅ Successfully created ${recipients.length} recipients for notifiable ${notifiable.id}`,
    );
  }

  /**
   * 알림 데이터 생성 (NotificationCoreData)
   * - Newsletter, Reminder, Survey 타입별로 다른 템플릿 사용
   * - 실제 발송 시 사용할 데이터 구조
   */
  private _buildNotificationCoreData(
    nanoId: string,
    student: Student,
    term: Term,
    notifiable: Notifiable,
    sourceEntity: Newsletter | Reminder | Survey,
  ): NotificationCoreData {
    let body: string;
    let title: string;
    let template: string;

    const shortlink = `${this.domain}/${nanoId}`;

    switch (notifiable.type) {
      case NotifiableSourceType.NEWSLETTER: {
        const newsletter = sourceEntity as Newsletter;
        title =
          newsletter.title || this._getDefaultNewsletterTitle(newsletter.type);
        body = this._getNewsletterBody(newsletter, term, shortlink);
        template = this._getNewsletterTemplateName(newsletter.type);
        break;
      }

      case NotifiableSourceType.REMINDER: {
        const reminder = sourceEntity as Reminder;
        const schoolName = reminder.school.name;
        const termName = reminder.term.termName;
        title = reminder.title || '수강 신청 안내';
        body = getTemplateOfRegistration({
          school: schoolName,
          term: termName,
          period: term.bookingPeriod,
          shortlink: shortlink,
        });
        template = 'Registration1';
        break;
      }

      case NotifiableSourceType.SURVEY: {
        const survey = sourceEntity as Survey;
        const schoolName = survey.school.name;
        title = survey.title || '만족도 조사';
        body = `[${schoolName}] 만족도 조사\n\n${survey.intro || ''}\n\n◼ 참여하기 : ${shortlink}`;
        template = 'Survey1';
        break;
      }

      default:
        title = notifiable.title || '새로운 알림';
        body = notifiable.message || '';
        template = 'Unknown';
    }

    return {
      token: student.parent.user?.pushToken || null,
      phone: student.parent.phone,
      template: template,
      title: title,
      body: body,
      role: 'PARENT',
      url: shortlink,
      routes: {
        nanoId: nanoId,
        type: notifiable.type,
        termId: notifiable.termId.toString(),
        studentId: student.id.toString(),
      },
    };
  }

  /**
   * Newsletter 타입별 본문 생성
   */
  private _getNewsletterBody(
    newsletter: Newsletter,
    term: Term,
    shortlink: string,
  ): string {
    switch (newsletter.type) {
      case NewsletterType.CHANGES:
        return getTemplateOfNewsSchedule({
          school: newsletter.school.name,
          term: newsletter.term.termName,
          title: newsletter.title || '수업 일정 안내',
          shortlink: shortlink,
        });
      case NewsletterType.MANAGEMENT:
        return getTemplateOfNewsManagement({
          school: newsletter.school.name,
          term: newsletter.term.termName,
          title: newsletter.title || '수업 운영 안내',
          shortlink: shortlink,
        });
      case NewsletterType.SUPPLIES:
        return getTemplateOfNewsSupplies({
          school: newsletter.school.name,
          term: newsletter.term.termName,
          title: newsletter.title || '수업 준비물 안내',
          shortlink: shortlink,
        });
      case NewsletterType.RESULT:
        return getTemplateOfNewsRegistrationResult({
          school: newsletter.school.name,
          term: newsletter.term.termName,
          title: newsletter.title || '수강 신청 결과',
          shortlink: shortlink,
        });
      default:
        return '';
    }
  }

  /**
   * Newsletter 타입별 템플릿 이름
   */
  private _getNewsletterTemplateName(type: NewsletterType): string {
    switch (type) {
      case NewsletterType.CHANGES:
        return 'NewsSchedule1';
      case NewsletterType.MANAGEMENT:
        return 'NewsClassChange1';
      case NewsletterType.RESULT:
        return 'NewsRegistrationResult1';
      case NewsletterType.SUPPLIES:
        return 'NewsClassSupplies1';
      default:
        return 'Unknown';
    }
  }

  /**
   * Newsletter 타입별 기본 제목
   */
  private _getDefaultNewsletterTitle(type: NewsletterType): string {
    switch (type) {
      case NewsletterType.CHANGES:
        return '수업 일정 안내';
      case NewsletterType.MANAGEMENT:
        return '수업 변동사항 안내';
      case NewsletterType.RESULT:
        return '수강 신청 결과';
      case NewsletterType.SUPPLIES:
        return '수업 준비물 안내';
      default:
        return '새로운 공지사항';
    }
  }
}
