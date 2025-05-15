import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { DataSource, Not, Repository } from 'typeorm';
import { CreateStudentDto } from './dto/create-student.dto';
import { School } from '../school/entities/school.entity';

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
  async create(dto: CreateStudentDto): Promise<Student> {
    const { parent: parentDto, ...studentDto } = dto;

    let parentId: number | undefined;

    // 1. 학교 존재 여부 확인
    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. 학생 존재 여부 확인
    const existingStudent = await this.studentRepository.findOne({
      where: {
        schoolId: studentDto.schoolId,
        grade: studentDto.grade,
        class: studentDto.class,
        studentCode: studentDto.studentCode,
      },
    });

    if (existingStudent) {
      throw new ConflictException(HttpErrorConstants.CONFLICT_STUDENT);
    }

    // 3. 보호자 존재 여부 확인 ( 학부모는 Upsert 가능 ! )
    if (parentDto?.phone) {
      let parent = await this.parentRepository.findOne({
        where: { phone: parentDto.phone },
      });
      if (!parent) {
        parent = await this.parentRepository.save({
          ...parentDto,
        });
      }
      parentId = parent.id;
    }

    // 4. 학생 생성
    const student = this.studentRepository.create({
      ...studentDto,
      parentId,
    });
    await this.studentRepository.save(student);

    return await this.studentRepository.findOneOrFail({
      where: { id: student.id },
      relations: ['parent'],
    });
  }

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
    // 1. 학교 존재 여부 확인
    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. Unique 제약 조건 확인 (학교-학년-반-번호) 기반
    const isStudent = await this.studentRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        grade: dto.grade,
        class: dto.class,
        studentCode: dto.studentCode,
        id: Not(id),
      },
    });

    if (isStudent) {
      throw new ConflictException(HttpErrorConstants.CONFLICT_STUDENT);
    }

    const student = await this.studentRepository.preload({ id, ...dto });
    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
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
