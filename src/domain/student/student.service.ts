import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private dataSource: DataSource,
    private readonly s3Service: S3Service,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  async findAll(query: PaginateQuery): Promise<Paginated<Student>> {
    const queryBuilder = this.studentRepository.createQueryBuilder('student');
    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        isActive: [FilterOperator.EQ],
        studentType: [FilterOperator.EQ],
      },
    });
  }

  async findActive(): Promise<Student[]> {
    return await this.studentRepository
      .createQueryBuilder('student')
      .orderBy('student.id', 'DESC')
      .where({ isActive: true })
      .getMany();
  }

  async findById(id: number, relations: string[] = []): Promise<Student> {
    try {
      return relations.length > 0
        ? await this.studentRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.studentRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.studentRepository.preload({ id, ...dto });
    if (!student) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.studentRepository.save(student);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  // note that this is hard-delete
  async remove(id: number): Promise<Student> {
    const student = await this.findById(id);
    return await this.studentRepository.remove(student);
  }

  // note that this is hard-delete
  async deleteImages(url: string): Promise<void> {
    await this.s3Service.delete(url);
  }
}
