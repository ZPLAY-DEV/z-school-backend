import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  FilterSuffix,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { CreateLedgerDto } from 'src/domain/ledger/dto/create-ledger.dto';
import { UpdateLedgerDto } from 'src/domain/ledger/dto/update-ledger.dto';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, Repository } from 'typeorm';
import { Ledger } from './entities/ledger.entity';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(Ledger)
    private ledgerRepository: Repository<Ledger>,
    private dataSource: DataSource,
    private readonly slack: SlackService,
  ) {}

  async create(dto: CreateLedgerDto): Promise<Ledger> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = queryRunner.manager.create(Ledger, dto);
      const ledger = await queryRunner.manager.save(item);

      // 트랜잭션 커밋 추가
      await queryRunner.commitTransaction();
      return ledger;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: PaginateQuery): Promise<Paginated<Ledger>> {
    return await paginate(query, this.ledgerRepository, {
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

  async findById(id: number, relations: string[] = []): Promise<Ledger> {
    try {
      return relations.length > 0
        ? await this.ledgerRepository.findOneOrFail({
            where: { id },
            relations,
            // order: {
            //   comments: {
            //     id: 'DESC',
            //   },
            // },
          })
        : await this.ledgerRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  async update(id: number, updateLedgerDto: UpdateLedgerDto): Promise<Ledger> {
    const ledger = await this.findById(id);
    Object.assign(ledger, updateLedgerDto);
    return await this.ledgerRepository.save(ledger);
  }

  async remove(id: number): Promise<void> {
    const ledger = await this.findById(id);
    await this.ledgerRepository.remove(ledger);
  }
}
