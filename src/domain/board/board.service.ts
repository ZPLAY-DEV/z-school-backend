import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { DataSource, Repository } from 'typeorm';
import { School } from '../school/entities/school.entity';
import { Group } from '../group/entities/group.entity';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { RemovalStatus, Role } from 'src/common/enums';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { InstructorSchool } from '../instructor/entities/instructor-school.entity';
import { Instructor } from '../instructor/entities/instructor.entity';
import { Parent } from '../parent/entities/parent.entity';
import { Student } from '../student/entities/student.entity';

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

  async createComment(dto: CreateCommentDto): Promise<void> {
    const board = await this.boardRepository.findOne({
      where: { id: dto.boardId },
      relations: ['school'],
    });

    if (!board) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_BOARD);
    }

    let name: string | null;

    if (dto.userRole === Role.MANAGER) {
      name = board.school.name ? `${board.school.name} 관리자` : '학교 관리자';
      console.log('name', name);
    } else if (dto.userRole === Role.INSTRUCTOR) {
      const schoolInstructor = await this.dataSource.manager
        .createQueryBuilder(InstructorSchool, 'instructorSchool')
        .innerJoin(
          Instructor,
          'instructor',
          'instructorSchool.instructorId = instructor.id',
        )
        .select(['instructorSchool.alias'])
        .where('instructorSchool.schoolId = :schoolId', {
          schoolId: board.school.id,
        })
        .andWhere('instructor.userId = :userId', {
          userId: dto.userId,
        })
        .getOne();
      // name = schoolInstructor?.alias
      //   ? `${schoolInstructor.alias} 강사`
      //   : '강사님';
      console.log('schoolInstructor', schoolInstructor);
    } else if (dto.userRole === Role.PARENT) {
      const parent = await this.dataSource.manager
        .createQueryBuilder(Parent, 'parent')
        .innerJoin(Student, 'student', 'parent.id = student.parentId')
        .select(['student.name'])
        .where('student.schoolId = :schoolId', {
          schoolId: board.school.id,
        })
        .andWhere('parent.userId = :userId', {
          userId: dto.userId,
        })
        .getOne();
      console.log('parent', parent);
    }
    // const comment = this.commentRepository.create(dto);
    // return await this.commentRepository.save(comment);
  }

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
