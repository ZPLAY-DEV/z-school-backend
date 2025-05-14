import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, In, Repository } from 'typeorm';
import { SchoolService } from './school.service';
import { Board } from '../board/entities/board.entity';
import { School } from './entities/school.entity';
import { Comment } from '../board/entities/comment.entity';
import { BoardTarget } from 'src/common/enums';

@Injectable()
export class SchoolBoardService {
  private readonly logger = new Logger(SchoolService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
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

  async listByMine(schoolId: number, userId: number): Promise<Board[]> {
    return await this.boardRepository.find({
      where: {
        schoolId,
        userId,
      },
    });
  }

  async listByTarget(
    schoolId: number,
    target: BoardTarget,
    groupIds: number[],
  ): Promise<Board[]> {
    return await this.boardRepository.find({
      where: {
        schoolId,
        target,
        groupId: groupIds.length > 0 ? In(groupIds) : undefined,
      },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
}
