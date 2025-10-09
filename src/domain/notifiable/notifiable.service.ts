import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { NotifiableTarget, SendStatus } from 'src/common/enums';
import { NotifiableStatusItemDto } from 'src/domain/notifiable/dto/notifiable-status-item.dto';
import { SendNotifiableDto } from 'src/domain/notifiable/dto/send-notifiable.dto';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { Student } from 'src/domain/student/entities/student.entity';
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
   * Notifiable 발송
   * - 발송 대상 설정 및 학생 목록 조회
   * - scheduledAt에 따라 즉시 발송 또는 예약 발송
   */
  async send(dto: SendNotifiableDto): Promise<Notifiable> {
    const notifiable = await this.findById(dto.notifiableId, [
      'newsletter',
      'survey',
      'reminder',
    ]);

    // 발송 대상 학생 목록 조회
    const students = await this._getStudentsByTarget(
      notifiable.schoolId,
      notifiable.termId,
      dto.target,
      dto.targetItems,
    );

    if (students.length === 0) {
      throw new BadRequestException('발송 대상 학생이 없습니다.');
    }

    // 중복 제거된 학생 ID 목록
    const studentIds = Array.from(new Set(students.map((s) => s.id)));

    this.logger.log(
      `📤 Preparing to send notifiable ${dto.notifiableId} to ${studentIds.length} students`,
    );

    // Notifiable 업데이트
    notifiable.target = dto.target;
    notifiable.targetItems = dto.targetItems || null;
    notifiable.targetLabel = dto.targetLabel || null;
    notifiable.studentIds = studentIds;
    notifiable.scheduledAt = dto.scheduledAt || null;
    notifiable.status = dto.status || SendStatus.INIT;

    // scheduledAt이 없으면 즉시 발송, 있으면 예약 발송
    if (!dto.scheduledAt) {
      notifiable.status = SendStatus.INIT;
      this.logger.log(
        `⚡ Immediate send requested for notifiable ${notifiable.id}`,
      );
    } else {
      notifiable.status = SendStatus.SCHEDULED;
      this.logger.log(
        `⏰ Scheduled send for notifiable ${notifiable.id} at ${dto.scheduledAt?.toString()}`,
      );
    }

    const savedNotifiable = await this.notifiableRepository.save(notifiable);

    // TODO: 실제 발송 로직 구현 필요 (Recipient 생성, NotificationService 호출)
    this.logger.warn('⚠️ Actual send logic needs to be implemented');

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
          class: 'ASC',
          studentCode: 'ASC',
        },
      },
    });

    // 결과를 NotifiableStatusItemDto 형태로 변환
    return recipients.map((recipient) => ({
      id: recipient.student.id,
      name: recipient.student.name,
      grade: recipient.student.grade,
      class: recipient.student.class,
      studentCode: recipient.student.studentCode,
      link: recipient.nanoid ? `${this.domain}/${recipient.nanoid}` : null,
      sourceType: notifiable.sourceType,
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
      .addOrderBy('student.class', 'ASC')
      .addOrderBy('student.studentCode', 'ASC');

    const paginatedResult = await paginate<Recipient>(query, queryBuilder, {
      sortableColumns: ['id', 'student.name', 'student.grade', 'createdAt'],
      searchableColumns: ['student.name'],
      defaultSortBy: [
        ['student.grade', 'ASC'],
        ['student.class', 'ASC'],
        ['student.studentCode', 'ASC'],
      ],
      filterableColumns: {
        'student.grade': [FilterOperator.EQ, FilterOperator.IN],
        'student.class': [FilterOperator.EQ, FilterOperator.IN],
      },
    });

    // 결과를 NotifiableStatusItemDto로 변환
    const items: NotifiableStatusItemDto[] = paginatedResult.data.map(
      (recipient) => ({
        id: recipient.student.id,
        name: recipient.student.name,
        grade: recipient.student.grade,
        class: recipient.student.class,
        studentCode: recipient.student.studentCode,
        link: recipient.nanoid ? `${this.domain}/${recipient.nanoid}` : null,
        sourceType: notifiable.sourceType,
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

  /**
   * 발송 상태 업데이트
   */
  async updateStatus(
    id: number,
    status: SendStatus,
    sentAt?: Date,
  ): Promise<Notifiable> {
    const notifiable = await this.findById(id);

    notifiable.status = status;
    if (sentAt) {
      notifiable.sentAt = sentAt;
    }

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

    // Recipients도 함께 삭제
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
}
