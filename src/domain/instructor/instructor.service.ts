import {
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Group } from 'src/domain/group/entities/group.entity';
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { DataSource, Repository } from 'typeorm';
import { Sam } from '../sam/entities/sam.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';

@Injectable()
export class InstructorService {
  private readonly logger = new Logger(InstructorService.name);

  constructor(
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//
  async create(dto: CreateInstructorDto): Promise<Instructor> {
    const instructor = this.instructorRepository.create(dto);
    return await this.instructorRepository.save(instructor);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async infiniteList(query: PaginateQuery): Promise<Paginated<Instructor>> {
    const queryBuilder = this.instructorRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.schools', 'school')
      .leftJoinAndSelect('instructor.instructorLessons', 'instructorLesson')
      .leftJoinAndSelect('instructorLesson.lesson', 'lesson');

    const config: PaginateConfig<Instructor> = {
      sortableColumns: ['id'],
      defaultLimit: 20,
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        userId: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        phone: [FilterOperator.EQ, FilterOperator.ILIKE],
        hashtags: [FilterOperator.EQ, FilterOperator.IN],
        termsAgreedAt: [FilterOperator.NULL],
        'school.name': [FilterOperator.IN],
      },
    };

    return paginate<Instructor>(query, queryBuilder, config);
  }

  // name 으로 시작하는 과목을 가리키는 강사 리스트
  async list(name: string | null): Promise<Instructor[]> {
    const queryBuilder = this.instructorRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.schools', 'school')
      .leftJoinAndSelect('instructor.instructorLessons', 'instructorLesson')
      .leftJoinAndSelect('instructorLesson.lesson', 'lesson');

    if (name) {
      queryBuilder.where('instructor.name LIKE :name', { name: `${name}%` });
    }
    queryBuilder.orderBy('instructor.id', 'DESC');

    return await queryBuilder.getMany();
  }

  async findById(id: number, relations: string[] = []): Promise<Instructor> {
    try {
      return relations.length > 0
        ? await this.instructorRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.instructorRepository.findOneOrFail({
            where: { id },
          });
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(`Instructor not found`);
    }
  }

  async listGroups(instructorId: number): Promise<Group[]> {
    return this.groupRepository.find({
      where: { samId: instructorId },
      relations: ['lesson'],
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateInstructorDto): Promise<Instructor> {
    const instructor = await this.instructorRepository.preload({
      ...dto,
      id,
    });
    if (!instructor) {
      throw new NotFoundException(`Instructor not found`);
    }
    return await this.instructorRepository.save(instructor);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number, note: string | undefined): Promise<void> {
    if (note) {
      await this.instructorRepository.update(
        { id },
        { note, deletedAt: new Date() },
      );
    } else {
      const instructor = await this.findById(id);
      await this.instructorRepository.softRemove(instructor);
    }
  }
}
