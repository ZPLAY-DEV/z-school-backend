import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class SchoolStudentService {
  private readonly logger = new Logger(SchoolStudentService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    private dataSource: DataSource, // for transaction
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateStudentDto): Promise<Student> {
    const { parent: parentDto, ...studentDto } = dto;

    let parentId: number | undefined;
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

    const existingStudent = await this.studentRepository.findOne({
      where: {
        name: studentDto.name,
        parentId: parentId,
      },
    });

    if (existingStudent) {
      const updatedStudent = this.studentRepository.merge(existingStudent, {
        ...studentDto,
        parentId,
      });
      return this.studentRepository.save(updatedStudent);
    } else {
      const newStudent = this.studentRepository.create({
        ...studentDto,
        parentId,
      });
      return this.studentRepository.save(newStudent);
    }
  }

  async createBulk(
    schoolId: number,
    dtos: CreateStudentDto[],
  ): Promise<number> {
    if (!dtos.length) {
      return 0;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Step 1: Upsert Parents
      const parents = dtos.map((v) => v.parent);
      const parentValues = parents
        .map((parent) => {
          return `(
            ${parent.userId || 'NULL'}, 
            ${parent.name ? `'${parent.name}'` : 'NULL'}, 
            ${parent.phone ? `'${parent.phone}'` : 'NULL'}, 
            ${parent.note ? `'${parent.note}'` : 'NULL'}
          )`;
        })
        .join(',');
      await queryRunner.query(`
        INSERT INTO parents (userId, name, phone, note)
        VALUES ${parentValues}
        ON DUPLICATE KEY UPDATE 
          userId = VALUES(userId),
          name = VALUES(name),
          note = VALUES(note);
      `);

      // Step 2: Fetch Parent Ids
      const parentPhoneNumbers = parents.map((p) => p.phone);
      const parentRecords = (await queryRunner.query(`
        SELECT phone, id FROM parents WHERE phone IN (${parentPhoneNumbers.join(',')})
      `)) as Array<{ phone: string; id: number }>;
      const parentMap = Object.fromEntries(
        parentRecords.map((v) => [v.phone, v.id] as [string, number]),
      );

      // Step 3: Bulk Upsert Students
      const studentValues = dtos
        .map(
          (dto) => `(
            ${dto.name ? `'${dto.name}'` : 'NULL'},
            ${parentMap[dto.parent.phone]},
            ${schoolId},
            ${dto.grade ? `'${dto.grade}'` : 'NULL'}, 
            ${dto.class ? `'${dto.class}'` : 'NULL'},
            ${dto.studentCode ? `'${dto.studentCode}'` : 'NULL'}, 
            ${dto.phone ? `'${dto.phone}'` : 'NULL'},
            ${dto.escortPhone ? `'${dto.escortPhone}'` : 'NULL'},
            ${dto.homeTransit ? `'${dto.homeTransit}'` : 'NULL'}, 
            ${dto.nextStop ? `'${dto.nextStop}'` : 'NULL'},
            ${dto.note ? `'${dto.note}'` : 'NULL'}
          )`,
        )
        .join(',');
      await queryRunner.query(`
        INSERT INTO students (
          name,
          parentId,
          schoolId,
          grade,
          class,
          studentCode,
          phone,
          escortPhone,
          homeTransit,
          nextStop,
          note
        )
        VALUES ${studentValues}
        ON DUPLICATE KEY UPDATE 
          schoolId = VALUES(schoolId),
          grade = VALUES(grade),
          class = VALUES(class),
          studentCode = VALUES(studentCode),
          phone = VALUES(phone),
          escortPhone = VALUES(escortPhone),
          homeTransit = VALUES(homeTransit),
          nextStop = VALUES(nextStop),
          note = VALUES(note);
      `);

      await queryRunner.commitTransaction();

      return dtos.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      throw error;
    } finally {
      // queryRunner가 release 되었는지 확인
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  async infiniteList(
    schoolId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .where('student.schoolId = :schoolId', { schoolId });

    return await paginate<Student>(query, queryBuilder, {
      relations: {
        parent: true,
      },
      sortableColumns: ['id', 'grade', 'class', 'studentCode', 'name'],
      searchableColumns: ['name', 'phone', 'escortPhone'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        grade: [FilterOperator.EQ],
        class: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
        'parent.phone': [FilterOperator.EQ],
      },
    });
  }

  async list(schoolId: number): Promise<Student[]> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .where('student.schoolId = :schoolId', { schoolId })
      // .andWhere('student.isActive = :isActive', { isActive: true })
      .orderBy('student.id', 'DESC');

    return await queryBuilder.getMany();
  }
}
