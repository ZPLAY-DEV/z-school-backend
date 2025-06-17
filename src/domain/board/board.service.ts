import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RemovalStatus } from 'src/common/enums';
import { DataSource, Repository } from 'typeorm';
import { Group } from '../group/entities/group.entity';
import { School } from '../school/entities/school.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Board } from './entities/board.entity';
import { Comment } from './entities/comment.entity';

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
      throw new NotFoundException('School not found');
    }

    // 2) 그룹 존재 여부 조회
    const group = await this.dataSource.manager.findOne(Group, {
      where: {
        id: dto.groupId,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
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
      throw new NotFoundException('Board not found');
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
      throw new NotFoundException('Board not found');
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
      throw new NotFoundException('Board not found');
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
      throw new NotFoundException('Comment not found');
    }

    await this.commentRepository.update(id, dto);

    return await this.commentRepository.findOneOrFail({ where: { id } });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
  async removeBoard(id: number, userId: number): Promise<RemovalStatus> {
    return await this.dataSource.transaction(async (manager) => {
      // 1) 게시글 조회
      const board = await manager.findOne(Board, {
        where: {
          id,
          user: { id: userId },
        },
      });

      if (!board) {
        throw new NotFoundException('Board not found');
      }

      // 2) 댓글 삭제
      await manager.delete(Comment, { boardId: id });

      // 3) 게시글 삭제
      await manager.delete(Board, id);

      return RemovalStatus.DELETED;
    });
  }

  async removeComment(id: number, userId: number): Promise<RemovalStatus> {
    const comment = await this.commentRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.commentRepository.delete(id);

    return RemovalStatus.DELETED;
  }
}
