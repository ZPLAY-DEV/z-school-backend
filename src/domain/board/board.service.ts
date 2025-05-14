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
  async create(dto: CreateBoardDto): Promise<Board> {
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

  async createComment(dto: CreateCommentDto) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  findAll() {
    return `This action returns all board`;
  }

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
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//
  async update(id: number, dto: UpdateBoardDto): Promise<Board> {
    const board = await this.boardRepository.preload({ id, ...dto });
    if (!board) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
    return await this.boardRepository.save(board);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
  async remove(id: number): Promise<RemovalStatus> {
    return await this.dataSource.transaction(async (manager) => {
      await manager.findOne(Board, { where: { id } });

      await manager.delete(Board, id);

      await manager.delete(Comment, { boardId: id });

      return RemovalStatus.DELETED;
    });
  }
}
