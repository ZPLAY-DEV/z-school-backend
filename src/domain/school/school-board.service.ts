import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, In, Repository } from 'typeorm';
import { SchoolService } from './school.service';
import { CreateBoardDto } from '../board/dto/create-board.dto';
import { Board } from '../board/entities/board.entity';
import { School } from './entities/school.entity';
import { Comment } from '../board/entities/comment.entity';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Group } from '../group/entities/group.entity';
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
  //? Create
  //? ---------------------------------------------------------------------- ?//
  async create(dto: CreateBoardDto): Promise<Board> {
    console.log(dto);
    // 1) 학교 조회
    const school = await this.schoolRepository.findOne({
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2) 그룹이 있을 경우 조회
    if (dto.groupId) {
      const group = await this.dataSource.manager.findOne(Group, {
        where: {
          id: dto.groupId,
        },
      });
      if (!group) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_GROUP);
      }
    }

    // 3) 게시글 생성
    const board = this.boardRepository.create(dto);
    return await this.boardRepository.save(board);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number, userId: number): Promise<Board[]> {
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
