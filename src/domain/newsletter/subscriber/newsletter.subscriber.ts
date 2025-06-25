import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose/dist/common';
import { EventStatus, NewsletterTarget, StudentStatus } from 'src/common/enums';
import { IEvent, IEventKey } from 'src/domain/event/entities/event.interface';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { CreateShortlinkDto } from 'src/domain/shortlink/dto/create-shortlink.dto';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { chunk } from 'src/helpers/array';
import { translateNewsletterType } from 'src/helpers/translate';
import {
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  In,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

@Injectable()
@EventSubscriber()
export class NewsletterSubscriber
  implements EntitySubscriberInterface<Newsletter>
{
  private readonly logger = new Logger(NewsletterSubscriber.name);

  constructor(
    @InjectModel('Event')
    private readonly eventModel: Model<IEvent, IEventKey>,
  ) {}

  listenTo(): typeof Newsletter {
    return Newsletter;
  }

  async afterInsert(event: InsertEvent<Newsletter>): Promise<void> {
    const newsletter = event.entity;
    if (newsletter.scheduledAt) {
      await this.handleScheduledNewsletter(newsletter, event.manager);
    }
  }

  async afterUpdate(event: UpdateEvent<Newsletter>): Promise<void> {
    const newsletter = event.entity as Newsletter;
    const previousNewsletter = event.databaseEntity;

    // scheduledAt이 새로 설정된 경우에만 실행
    // (이전에는 null이었는데 지금은 값이 있는 경우)
    const wasScheduledAtNull = !previousNewsletter?.scheduledAt;
    const isScheduledAtSet = !!newsletter?.scheduledAt;

    if (wasScheduledAtNull && isScheduledAtSet) {
      await this.handleScheduledNewsletter(newsletter, event.manager);
    }
  }

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

      // 숏링크 생성
      const shortlinks = await this.createShortlinks(
        manager,
        newsletter,
        students,
      );

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
      const event = await this.eventModel.get({
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
      relations: { parent: true },
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

    // DynamoDB upsert: 동일한 key면 자동으로 기존 레코드 덮어씀
    await this.eventModel.create(event);
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
