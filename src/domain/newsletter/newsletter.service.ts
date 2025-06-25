import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose/dist/common';
import { IEvent, IEventKey } from 'src/domain/event/entities/event.interface';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { DataSource, EntityManager } from 'typeorm';

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
      // 뉴스레터 생성 - subscriber가 나머지 모든 처리
      return await this.createNewsletter(manager, dto);
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
    const newsletter = await this.newsletterRepository.preload({
      id,
      ...dto,
    });
    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }
    // 업데이트 - subscriber가 scheduled 처리
    return this.newsletterRepository.save(newsletter) as Promise<Newsletter>;
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
    if (!school.phone) {
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
}
