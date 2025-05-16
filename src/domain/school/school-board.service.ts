import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, In, Repository } from 'typeorm';
import { SchoolService } from './school.service';
import { Board } from '../board/entities/board.entity';
import { Comment } from '../board/entities/comment.entity';
import { BoardTarget } from 'src/common/enums';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';

@Injectable()
export class SchoolBoardService {
  private readonly logger = new Logger(SchoolService.name);

  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly s3Service: S3Service,
    private dataSource: DataSource, // for transaction
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  //? 내가 작성한 게시글 목록
  async listByMine(schoolId: number, userId: number): Promise<Board[]> {
    return await this.boardRepository.find({
      where: {
        schoolId,
        userId,
      },
    });
  }

  //? 내가 작성한 게시글 목록 (페이징)
  async listByMinePaginated(
    schoolId: number,
    userId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    const queryBuilder = this.boardRepository
      .createQueryBuilder('board')
      .where('board.schoolId = :schoolId', { schoolId })
      .andWhere('board.userId = :userId', { userId });

    return await paginate<Board>(query, queryBuilder, {
      sortableColumns: ['createdAt'],
      searchableColumns: ['title'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
        target: [FilterOperator.EQ],
      },
    });
  }

  //? 대상 게시글 목록
  async listByTarget(
    schoolId: number,
    target?: BoardTarget,
    groupIds?: number[],
  ): Promise<Board[]> {
    return await this.boardRepository.find({
      where: {
        schoolId,
        target: target ? target : undefined,
        groupId: groupIds && groupIds.length > 0 ? In(groupIds) : undefined,
      },
    });
  }

  //? 대상 게시글 목록 (페이징)
  async listByTargetPaginated(
    schoolId: number,
    target: BoardTarget,
    groupIds: number[],
    query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    const queryBuilder = this.boardRepository
      .createQueryBuilder('board')
      .where('board.schoolId = :schoolId', { schoolId });

    if (target) {
      queryBuilder.andWhere('board.target = :target', { target });
    }

    // groupIds가 비어 있지 않을 때만 IN 조건 추가
    if (groupIds.length > 0) {
      queryBuilder.andWhere('board.groupId IN (:...groupIds)', { groupIds });
    }

    return await paginate<Board>(query, queryBuilder, {
      sortableColumns: ['createdAt'],
      searchableColumns: ['title'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
}
