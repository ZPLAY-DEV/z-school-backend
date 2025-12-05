import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Group } from 'src/domain/group/entities/group.entity';
import { Repository } from 'typeorm';

@Injectable()
export class StudentGroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  //? 학생의 수강중인 모든 반 조회 (termId 없이)
  async listGroups(studentId: number): Promise<Group[]> {
    return await this.groupRepository
      .createQueryBuilder('group')
      .innerJoin('group.picks', 'pick')
      .innerJoinAndSelect('group.lesson', 'lesson')
      .leftJoinAndSelect('lesson.curriculums', 'curriculum')
      .leftJoinAndSelect('curriculum.syllabus', 'syllabus')
      .where('pick.studentId = :studentId', { studentId })
      .andWhere('pick.isActive = :isActive', { isActive: true })
      .getMany();
  }

  //? 학생의 수강중인 모든 반 조회 - 페이지네이션 (termId 없이)
  async infiniteListGroups(
    studentId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Group>> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .where('pick.studentId = :studentId', { studentId })
      .andWhere('pick.isActive = :isActive', { isActive: true });

    const config: PaginateConfig<Group> = {
      sortableColumns: ['id', 'groupName'],
      filterableColumns: {
        groupName: [FilterOperator.ILIKE],
      },
    };

    return paginate(query, queryBuilder, config);
  }
}
