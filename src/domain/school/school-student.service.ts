import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { School } from './entities/school.entity';

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

  async create(dto: CreateStudentDto, schoolId: number): Promise<Student> {
    const { parent: parentDto, ...studentDto } = dto;

    let parentId: number | undefined;

    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(`School not found`);
    }

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
        schoolId: studentDto.schoolId,
        grade: studentDto.grade,
        class: studentDto.class,
        studentCode: studentDto.studentCode,
        // parentId: parentId,
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
    dryrun: boolean = false, // 덮어쓰진 않고, 덮어쓰여질 레코드 목록만 반환
  ): Promise<number | Student[]> {
    if (dryrun) {
      return await this.checkExistingStudents(dtos);
    }

    if (!dtos.length) {
      return 0;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Step 1:  Find school
      const school = await queryRunner.manager.findOne(School, {
        where: { id: schoolId },
      });
      if (!school) {
        throw new NotFoundException(`School not found`);
      }

      // Step 2: Upsert Parents (MySQL 8.0+ alias 문법 사용)
      const parents = dtos.map((v) => v.parent);

      if (parents.length > 0) {
        const parentPlaceholders = parents.map(() => '(?, ?, ?, ?)').join(', ');
        const parentValues = parents.flatMap((parent) => [
          parent.userId || null,
          parent.name || null,
          parent.phone || null,
          parent.note || null,
        ]);

        await queryRunner.query(
          `
          INSERT INTO parents (userId, name, phone, note)
          VALUES ${parentPlaceholders} AS new_parent(userId, name, phone, note)
          ON DUPLICATE KEY UPDATE 
            userId = new_parent.userId,
            name = new_parent.name,
            note = new_parent.note
        `,
          parentValues,
        );
      }

      // Step 3: Fetch Parent Ids (SQL injection 방지)
      const parentPhoneNumbers = parents.map((p) => `'${p.phone}'`).join(',');

      const parentRecords = (await queryRunner.query(`
        SELECT phone, id FROM parents WHERE phone IN (${parentPhoneNumbers})
      `)) as Array<{ phone: string; id: number }>;

      const parentMap = Object.fromEntries(
        parentRecords.map((v) => [v.phone, v.id] as [string, number]),
      );

      // Step 4: Bulk Upsert Students (MySQL 8.0+ alias 문법 사용)
      if (dtos.length > 0) {
        const studentPlaceholders = dtos
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const studentValues = dtos.flatMap((dto) => [
          dto.name || null,
          parentMap[dto.parent.phone] || null,
          schoolId,
          dto.grade || null,
          dto.class || null,
          dto.studentCode || null,
          dto.phone || null,
          dto.escortPhone || null,
          dto.homeTransit || null,
          dto.nextStop || null,
          dto.note || null,
        ]);

        await queryRunner.query(
          `
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
          VALUES ${studentPlaceholders} AS new_student(
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
          ON DUPLICATE KEY UPDATE 
            schoolId = new_student.schoolId,
            grade = new_student.grade,
            class = new_student.class,
            name = new_student.name,
            parentId = new_student.parentId,
            studentCode = new_student.studentCode,
            phone = new_student.phone,
            escortPhone = new_student.escortPhone,
            homeTransit = new_student.homeTransit,
            nextStop = new_student.nextStop,
            note = new_student.note
        `,
          studentValues,
        );
      }

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

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

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
        picks: true,
      },
      sortableColumns: ['grade', 'class', 'studentCode'],
      searchableColumns: ['name', 'parent.phone', 'escortPhone'],
      defaultSortBy: [
        ['grade', 'ASC'],
        ['class', 'ASC'],
        ['studentCode', 'ASC'],
      ],
      filterableColumns: {
        grade: [FilterOperator.EQ],
        class: [FilterOperator.EQ],
        studentCode: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
      },
    });
  }

  async list(schoolId: number): Promise<Student[]> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.picks', 'picks')
      .where('student.schoolId = :schoolId', { schoolId })
      // .andWhere('student.isActive = :isActive', { isActive: true })
      .orderBy('student.grade', 'ASC')
      .addOrderBy('student.class', 'ASC')
      .addOrderBy('student.studentCode', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * Check for existing Students that would be overwritten based on the compound unique key
   * (schoolId, grade, class, studentCode)
   */
  private async checkExistingStudents(
    dtos: CreateStudentDto[],
  ): Promise<Student[]> {
    // Extract unique key combinations from DTOs
    const uniqueKeyCombinations = dtos.map((dto) => ({
      schoolId: dto.schoolId,
      grade: dto.grade,
      class: dto.class,
      studentCode: dto.studentCode,
    }));

    // Find existing lessons that match any of these combinations
    const existingStudents = await this.studentRepository.find({
      where: uniqueKeyCombinations.map((combo) => ({
        schoolId: combo.schoolId,
        grade: combo.grade,
        class: combo.class,
        studentCode: combo.studentCode,
      })),
    });

    // No existing lessons found means no records will be overwritten
    if (existingStudents.length === 0) {
      return [];
    }

    return existingStudents;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//
}
