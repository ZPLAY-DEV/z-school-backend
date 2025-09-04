import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { fromZonedTime } from 'date-fns-tz';
import { NewsletterType } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { UpdateDispatchDto } from 'src/domain/newsletter/dto/update-dispatch.dto';
import { Dispatch } from 'src/domain/newsletter/entities/dispatch.entity';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class NewsletterDispatchService {
  private readonly logger = new Logger(NewsletterDispatchService.name);
  constructor(
    @InjectRepository(Dispatch)
    private readonly dispatchRepository: Repository<Dispatch>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  // 발송 상세 조회
  async findById(id: number, relations?: string[]): Promise<Dispatch> {
    const dispatch = await this.dispatchRepository.findOne({
      where: { id },
      relations: relations ? relations : undefined,
    });

    if (!dispatch) {
      throw new NotFoundException('Dispatch not found');
    }

    return dispatch;
  }

  // 발송 목록 조회
  async list(type?: NewsletterType): Promise<Dispatch[]> {
    const queryBuilder = this.dispatchRepository
      .createQueryBuilder('dispatch')
      .leftJoinAndSelect('dispatch.newsletter', 'newsletter')
      .orderBy('dispatch.id', 'DESC');

    if (type) {
      queryBuilder.andWhere('newsletter.type = :type', { type });
    }

    const dispatches = await queryBuilder.getMany();

    return dispatches;
  }

  // 발송 예정 목록 조회
  async listReady(): Promise<Dispatch[]> {
    // 현재 서울 시간을 UTC로 변환
    const nowInSeoul = new Date();
    const nowInUTC = fromZonedTime(nowInSeoul, 'Asia/Seoul');

    const dispatches = await this.dispatchRepository.find({
      where: {
        status: SendStatus.SCHEDULED,
        scheduledAt: LessThan(nowInUTC),
      },
      relations: ['newsletter'],
      order: { scheduledAt: 'DESC' },
    });

    return dispatches;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(dispatchId: number, dto: UpdateDispatchDto): Promise<Dispatch> {
    const dispatch = await this.dispatchRepository.findOne({
      where: { id: dispatchId },
    });
    if (!dispatch) {
      throw new NotFoundException(`Dispatch not found`);
    }

    // 기존 엔티티에 DTO 속성들을 병합
    Object.assign(dispatch, dto);

    return await this.dispatchRepository.save(dispatch);
  }

  async cancel(id: number): Promise<Dispatch> {
    const dispatch = await this.dispatchRepository.preload({
      id,
      status: SendStatus.CANCELED,
    });
    if (!dispatch) {
      throw new NotFoundException(`Dispatch not found`);
    }

    // 재발송 때문에 shortlinks 삭제하지 않는다.

    return await this.dispatchRepository.save(dispatch);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async delete(id: number): Promise<Dispatch> {
    const dispatch = await this.findById(id);
    return await this.dispatchRepository.remove(dispatch);
  }
}
