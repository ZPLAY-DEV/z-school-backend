import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { StudentStatus } from 'src/common/enums';
import { ResponseSchoolGradesDto } from 'src/domain/school/dto/response-school-grades.dto';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { formatPhone, normalizePhone } from 'src/helpers/phone';
import { DataSource, Repository } from 'typeorm';
import { School } from './entities/school.entity';

@Injectable()
export class SchoolStudentService {
  private readonly logger = new Logger(SchoolStudentService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    private dataSource: DataSource, // for transaction
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async createBulkDryrun(
    schoolId: number,
    dtos: CreateStudentDto[],
  ): Promise<Student[]> {
    return await this.checkExistingStudents(dtos);
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
      // Step 1:  Find school
      const school = await queryRunner.manager.findOne(School, {
        where: { id: schoolId },
      });
      if (!school) {
        throw new NotFoundException(`School not found`);
      }

      // Step 2: Upsert Parents (MySQL 8.0+ alias 문법 사용)
      const parents = dtos.map((v) => ({
        ...v.parent,
        phone: normalizePhone(v.parent.phone),
      }));

      if (parents.length > 0) {
        const parentPlaceholders = parents.map(() => '(?, ?, ?, ?)').join(', ');
        const parentValues: (string | number | null)[] = parents.flatMap(
          (parent) => [
            parent.userId || null,
            parent.name || null,
            parent.phone || null,
            parent.note || null,
          ],
        );

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
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const studentValues: (string | number | null)[] = dtos.flatMap(
          (dto) => [
            dto.name || null,
            dto.parent.phone
              ? parentMap[normalizePhone(dto.parent.phone) as string] || null
              : null,
            schoolId,
            dto.grade || null,
            dto.class || null,
            dto.studentCode || null,
            dto.phone || null,
            dto.nextStop || null,
            dto.note || null,
            dto.status || 'ATTENDING',
          ],
        );

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
            nextStop,
            note,
            status
          )
          VALUES ${studentPlaceholders} AS new_student(
            name,
            parentId,
            schoolId,
            grade,
            class,
            studentCode,
            phone,
            nextStop,
            note,
            status
          )
          ON DUPLICATE KEY UPDATE 
            schoolId = new_student.schoolId,
            grade = new_student.grade,
            class = new_student.class,
            name = new_student.name,
            parentId = new_student.parentId,
            studentCode = new_student.studentCode,
            phone = new_student.phone,
            nextStop = new_student.nextStop,
            note = new_student.note,
            status = new_student.status
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

  async parseExcel(
    schoolId: number,
    file: Express.Multer.File,
  ): Promise<CreateStudentDto[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    // 첫번째 sheet
    const worksheet = workbook.worksheets[0];
    const students: CreateStudentDto[] = [];

    // 3) 실제 데이터 추출 (헤더 아래 행부터 시작)
    worksheet.eachRow((row, index) => {
      if (index < 2) return;

      const [_, name, grade, className, studentCode, parentPhone, phone, note] =
        row.values as any[]; // row.values[0] 은 항상 undefined

      if (!name || !grade || !className || !studentCode || !parentPhone) return;

      const student: CreateStudentDto = {
        name: name.toString().trim(),
        grade: Number(grade),
        class: className?.toString().trim(),
        studentCode: Number(studentCode),
        parent: {
          name: `${name?.toString().trim()} 보호자`,
          phone: parentPhone?.toString().trim(),
        },
        phone: phone ? phone.toString().trim() : null,
        note: note ? note.toString().trim() : null,
        status: StudentStatus.ATTENDING,
        schoolId,
      };

      students.push(student);
    });

    return students;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async generateExcel(schoolId: number): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const templateUrl =
      'https://cdn.xn--ov3b17fd5n5vf.kr/excels/students-v1.xlsx';
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();

    // 템플릿 파일 읽기
    await workbook.xlsx.load(Buffer.from(buffer));
    const sheet = workbook.getWorksheet(1);

    if (!sheet) {
      throw new Error('Sheet not found');
    }

    const students = await this.studentRepository.find({
      where: { schoolId: schoolId },
      relations: ['parent', 'parent.user'],
    });
    students.forEach((student, index) => {
      const row = sheet.insertRow(2 + index, []);
      if (student.status === StudentStatus.ATTENDING) {
        row.getCell(1).value = student.name;
        row.getCell(2).value = student.grade; // 학년
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).value = student.class; // 반
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).value = student.studentCode; // 번호
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).value = formatPhone(student.parent.phone); // 보호자 연락처
        row.getCell(6).value = formatPhone(student.phone); // 학생 연락처
        row.getCell(7).value = student.note;
      }
    });

    // sheet.columns.forEach((column, index) => {
    //   if (index < 4) {
    //     column.width = 10;
    //   } else {
    //     column.width = 15;
    //   }
    // });

    return workbook;
  }

  async list(
    schoolId: number,
    grade?: number,
    grades?: number[],
    attendingOnly?: boolean,
  ): Promise<Student[]> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.picks', 'picks')
      .where('student.schoolId = :schoolId', { schoolId })
      .orderBy('student.grade', 'ASC')
      .addOrderBy('student.class', 'ASC')
      .addOrderBy('student.studentCode', 'ASC');

    if (grade) {
      queryBuilder.andWhere('student.grade = :grade', { grade });
    }

    if (grades) {
      queryBuilder.andWhere('student.grade IN (:...grades)', { grades });
    }

    if (attendingOnly) {
      queryBuilder.andWhere('student.status = :status', {
        status: StudentStatus.ATTENDING,
      });
    }

    return await queryBuilder.getMany();
  }

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
      searchableColumns: ['name', 'parent.phone'],
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
        'picks.termId': [FilterOperator.EQ],
        note: [FilterOperator.EQ, FilterOperator.ILIKE, FilterOperator.NULL],
      },
    });
  }

  async getGradeClasses(schoolId: number): Promise<ResponseSchoolGradesDto[]> {
    const result = await this.studentRepository.query(
      'SELECT grade, class \
FROM students \
WHERE schoolId = ? \
GROUP BY grade, class \
ORDER BY grade, class',
      [schoolId],
    );

    // grade별로 그룹화하여 classes 배열로 변환
    const gradeMap = new Map<number, string[]>();

    result.forEach((row: { grade: number; class: string }) => {
      if (!gradeMap.has(row.grade)) {
        gradeMap.set(row.grade, []);
      }
      gradeMap.get(row.grade)!.push(row.class);
    });

    // Map을 배열로 변환하고 grade 순으로 정렬
    return Array.from(gradeMap.entries())
      .map(([grade, classes]) => ({ grade, classes }))
      .sort((a, b) => a.grade - b.grade);
  }
}
