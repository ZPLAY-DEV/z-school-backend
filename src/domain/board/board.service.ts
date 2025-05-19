import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { DataSource, Repository } from 'typeorm';
import { School } from '../school/entities/school.entity';
import { Group } from '../group/entities/group.entity';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { RemovalStatus } from 'src/common/enums';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//
  async createBoard(dto: CreateBoardDto): Promise<Board> {
    // 1) 학교 조회
    const school = await this.schoolRepository.findOne({
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2) 그룹 존재 여부 조회
    const group = await this.dataSource.manager.findOne(Group, {
      where: {
        id: dto.groupId,
      },
    });

    if (!group) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_GROUP);
    }

    // 3) 게시글 생성
    const board = this.boardRepository.create(dto);

    return await this.boardRepository.save(board);
  }

  async createComment(dto: CreateCommentDto): Promise<Comment> {
    const board = await this.boardRepository.findOne({
      where: { id: dto.boardId },
      relations: ['school', 'group'],
    });

    if (!board) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_BOARD);
    }

    const comment = this.commentRepository.create(dto);
    return await this.commentRepository.save(comment);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findById(id: number, relations: string[] = []): Promise<Board> {
    try {
      return relations.length > 0
        ? await this.boardRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.boardRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_BOARD);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//
  async updateBoard(id: number, dto: UpdateBoardDto): Promise<Board> {
    const board = await this.boardRepository.findOne({
      where: {
        id,
        user: { id: dto.userId },
      },
    });

    if (!board) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_BOARD);
    }

    await this.boardRepository.update(id, dto);

    return await this.boardRepository.findOneOrFail({ where: { id } });
  }

  async updateComment(id: number, dto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: {
        id,
        user: { id: dto.userId },
      },
    });

    if (!comment) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_COMMENT);
    }

    await this.commentRepository.update(id, dto);

    return await this.commentRepository.findOneOrFail({ where: { id } });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
  async remove(id: number, userId: number): Promise<RemovalStatus> {
    return await this.dataSource.transaction(async (manager) => {
      // 1) 게시글 조회
      const board = await manager.findOne(Board, {
        where: {
          id,
          user: { id: userId },
        },
      });

      if (!board) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_BOARD);
      }

      // 2) 댓글 삭제
      await manager.delete(Comment, { boardId: id });

      // 3) 게시글 삭제
      await manager.delete(Board, id);

      return RemovalStatus.DELETED;
    });
  }
}
