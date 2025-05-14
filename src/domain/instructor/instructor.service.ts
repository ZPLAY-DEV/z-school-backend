import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Repository } from 'typeorm';

@Injectable()
export class InstructorService {
  private readonly logger = new Logger(InstructorService.name);

  constructor(
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

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
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateInstructorDto): Promise<Instructor> {
    const data = {
      id,
      ...dto,
    } as unknown as Instructor;

    const instructor = await this.instructorRepository.preload(data);
    if (!instructor) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.instructorRepository.save(instructor);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  // note that this is hard-delete
  async remove(id: number): Promise<Instructor> {
    try {
      const instructor = await this.findById(id);
      await this.instructorRepository.softRemove(instructor);
      return instructor;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
