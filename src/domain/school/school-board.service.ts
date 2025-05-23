import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, In, Repository } from 'typeorm';
import { SchoolService } from './school.service';
import { Board } from '../board/entities/board.entity';
import { Comment } from '../board/entities/comment.entity';
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

  //? 강사가 작성한 게시글을 학교(매니저)에서 조회
  async list(schoolId: number): Promise<Board[]> {
    return await this.boardRepository.find({
      where: {
        schoolId,
      },
      order: {
        id: 'DESC',
      },
    });
  }

  //? 강사가 작성한 게시글을 학교(매니저)에서 조회 (페이징)
  async listPaginated(
    schoolId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    const queryBuilder = this.boardRepository
      .createQueryBuilder('board')
      .where('board.schoolId = :schoolId', { schoolId });

    return await paginate<Board>(query, queryBuilder, {
      sortableColumns: ['id'],
      searchableColumns: ['title'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    });
  }

  //? 내가 작성한 게시글 목록
  async listByMine(userId: number): Promise<Board[]> {
    return await this.boardRepository.find({
      where: {
        userId,
      },
      relations: {
        school: true,
      },
      order: {
        id: 'DESC',
      },
    });
  }

  //? 내가 작성한 게시글 목록 (페이징)
  async listByMinePaginated(
    userId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    const queryBuilder = this.boardRepository
      .createQueryBuilder('board')
      .where('board.userId = :userId', { userId });

    return await paginate<Board>(query, queryBuilder, {
      relations: {
        school: true,
      },
      sortableColumns: ['id'],
      searchableColumns: ['title'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    });
  }

  //? 대상 게시글 목록
  async listByTarget(groupIds?: number[]): Promise<Board[]> {
    return await this.boardRepository.find({
      where: {
        groupId: groupIds && groupIds.length > 0 ? In(groupIds) : undefined,
      },
      relations: {
        school: true,
      },
      order: {
        id: 'DESC',
      },
    });
  }

  //? 대상 게시글 목록 (페이징)
  async listByTargetPaginated(
    groupIds: number[],
    query: PaginateQuery,
  ): Promise<Paginated<Board>> {
    const queryBuilder = this.boardRepository.createQueryBuilder('board');

    // groupIds가 비어 있지 않을 때만 IN 조건 추가
    if (groupIds.length > 0) {
      queryBuilder.andWhere('board.groupId IN (:...groupIds)', { groupIds });
    }

    return await paginate<Board>(query, queryBuilder, {
      relations: {
        school: true,
      },
      sortableColumns: ['id'],
      searchableColumns: ['title'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
}
