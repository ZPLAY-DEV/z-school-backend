import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  FilterSuffix,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreatePayoutDto } from 'src/domain/payout/dto/create-payout.dto';
import { UpdatePayoutDto } from 'src/domain/payout/dto/update-payout.dto';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, Repository } from 'typeorm';
import { Payout } from './entities/payout.entity';

@Injectable()
export class PayoutService {
  constructor(
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    private dataSource: DataSource,
    private readonly slack: SlackService,
  ) {}

  async create(dto: CreatePayoutDto): Promise<Payout> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = queryRunner.manager.create(Payout, dto);
      const payout = await queryRunner.manager.save(item);
      return payout;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: PaginateQuery): Promise<Paginated<Payout>> {
    return await paginate(query, this.payoutRepository, {
      sortableColumns: ['createdAt'],
      nullSort: 'last',
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: ['description'],
      filterableColumns: {
        productId: [FilterOperator.EQ],
        userId: [FilterOperator.EQ],
        isPrivate: [FilterOperator.EQ, FilterSuffix.NOT],
      },
    });
  }

  async findById(id: number, relations: string[] = []): Promise<Payout> {
    try {
      return relations.length > 0
        ? await this.payoutRepository.findOneOrFail({
            where: { id },
            relations,
            // order: {
            //   comments: {
            //     id: 'DESC',
            //   },
            // },
          })
        : await this.payoutRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Payout not found`);
    }
  }

  async update(id: number, updatePayoutDto: UpdatePayoutDto): Promise<Payout> {
    const payout = await this.findById(id);
    Object.assign(payout, updatePayoutDto);
    return await this.payoutRepository.save(payout);
  }

  async remove(id: number): Promise<void> {
    const payout = await this.findById(id);
    await this.payoutRepository.remove(payout);
  }
}
