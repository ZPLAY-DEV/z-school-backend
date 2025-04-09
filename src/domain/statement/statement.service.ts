import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  FilterSuffix,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreateStatementDto } from 'src/domain/statement/dto/create-statement.dto';
import { UpdateStatementDto } from 'src/domain/statement/dto/update-statement.dto';
import { DataSource, Repository } from 'typeorm';
import { Statement } from './entities/statement.entity';

@Injectable()
export class StatementService {
  constructor(
    @InjectRepository(Statement)
    private statementRepository: Repository<Statement>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateStatementDto): Promise<Statement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = queryRunner.manager.create(Statement, dto);
      const statement = await queryRunner.manager.save(item);
      return statement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: PaginateQuery): Promise<Paginated<Statement>> {
    return await paginate(query, this.statementRepository, {
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

  async findById(id: number, relations: string[] = []): Promise<Statement> {
    try {
      return relations.length > 0
        ? await this.statementRepository.findOneOrFail({
            where: { id },
            relations,
            // order: {
            //   comments: {
            //     id: 'DESC',
            //   },
            // },
          })
        : await this.statementRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException('entity not found');
    }
  }

  async update(
    id: number,
    updateStatementDto: UpdateStatementDto,
  ): Promise<Statement> {
    const statement = await this.findById(id);
    Object.assign(statement, updateStatementDto);
    return await this.statementRepository.save(statement);
  }

  async remove(id: number): Promise<void> {
    const statement = await this.findById(id);
    await this.statementRepository.remove(statement);
  }
}
