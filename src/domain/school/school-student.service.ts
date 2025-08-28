import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { DataSource, QueryRunner, Repository } from 'typeorm';
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

    // 1. DTO 정규화 (전화번호 정규화)
    const normalizedDtos = dtos.map((dto) => ({
      ...dto,
      parent: {
        ...dto.parent,
        phone: dto.parent.phone ? normalizePhone(dto.parent.phone) : undefined,
      },
    }));

    // 2. 학교 존재 여부 확인
    const school = await this.schoolRepository.findOne({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException(`School not found: ${schoolId}`);
    }

    // 3. 트랜잭션 시작
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      this.logger.log(`Transaction started for school ${schoolId}`);

      // 4. 부모 처리 및 매핑
      const parentMap = await this.processParents(queryRunner, normalizedDtos);
      this.logger.log(
        `Processed ${parentMap.size} parents for school ${schoolId}`,
      );

      // 5. 학생 일괄 Upsert
      await this.upsertStudents(
        queryRunner,
        normalizedDtos,
        schoolId,
        parentMap,
      );
      this.logger.log(
        `Upserted ${normalizedDtos.length} students for school ${schoolId}`,
      );

      // 요청에 포함되지 않은 기존 Student 레코드는 business 로직상 남겨두는게 낫다.

      // 6. 트랜잭션 커밋
      await queryRunner.commitTransaction();

      return normalizedDtos.length;
    } catch (error) {
      // 트랜잭션이 활성 상태인 경우에만 롤백
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
        this.logger.log(`Transaction rolled back for school ${schoolId}`);
      }
      this.logger.error(
        `Failed to create bulk students for school ${schoolId}`,
        error.stack,
      );
      throw error;
    } finally {
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

  /**
   * 부모 정보를 처리하고 ID 매핑 (phone -> id)을 반환
   * - parent.id 포함시: 기존 parent 찾아서 정보 수정
   * - parent.id 미포함시: phone으로 parent 검색
   *   - 기존 parent 발견시: 해당 parent 정보 수정
   *   - 기존 parent 미발견시: 새로운 parent 생성
   */
  private async processParents(
    queryRunner: QueryRunner,
    dtos: CreateStudentDto[],
  ): Promise<Map<string, number>> {
    const parentMap = new Map<string, number>();
    const parentsToUpsert: Array<{
      id?: number;
      userId?: number | null;
      name: string | null;
      phone: string;
      note?: string | null;
      termsAgreedAt?: Date | null;
    }> = [];

    // 1단계: 각 DTO의 parent 처리 로직 적용
    for (const dto of dtos) {
      const { parent } = dto;

      if (parent.id) {
        // parent.id가 포함된 경우: 기존 parent 찾아서 정보 수정
        const existingParent = await queryRunner.query(
          'SELECT id, phone FROM parents WHERE id = ?',
          [parent.id],
        );

        if (existingParent.length === 0) {
          throw new NotFoundException(`Parent not found with id: ${parent.id}`);
        }

        const existingPhone = existingParent[0].phone as string;
        parentMap.set(existingPhone, parent.id);

        // 기존 parent 정보 업데이트
        parentsToUpsert.push({
          id: parent.id,
          userId: parent.userId || null,
          name: parent.name || null,
          phone: existingPhone,
          note: parent.note || null,
          termsAgreedAt: parent.termsAgreedAt || null,
        });
      } else {
        // parent.id가 없는 경우: phone으로 처리
        if (!parent.phone) {
          throw new BadRequestException(
            'Phone number is required when parent.id is not provided',
          );
        }

        // phone으로 기존 parent 검색 (이미 정규화된 전화번호 사용)
        const existingParent = await queryRunner.query(
          'SELECT id, phone FROM parents WHERE phone = ?',
          [parent.phone],
        );

        if (existingParent.length > 0) {
          // 기존 parent 발견: 정보 수정
          const existingId = existingParent[0].id as number;
          parentMap.set(parent.phone, existingId);

          parentsToUpsert.push({
            id: existingId,
            userId: parent.userId || null,
            name: parent.name || null,
            phone: parent.phone,
            note: parent.note || null,
            termsAgreedAt: parent.termsAgreedAt || null,
          });
        } else {
          // 기존 parent 미발견: 새로운 parent 생성
          parentsToUpsert.push({
            userId: parent.userId || null,
            name: parent.name || null,
            phone: parent.phone,
            note: parent.note || null,
            termsAgreedAt: parent.termsAgreedAt || null,
          });
          // 새로운 parent는 3단계에서 ID를 받아서 매핑에 추가됨
        }
      }
    }

    // 2단계: 부모 일괄 Upsert (MySQL 8.0+ alias 문법 사용)
    if (parentsToUpsert.length > 0) {
      const parentPlaceholders = parentsToUpsert
        .map(() => '(?, ?, ?, ?, ?)')
        .join(', ');

      const parentValues: (string | number | Date | null)[] =
        parentsToUpsert.flatMap((parent) => [
          parent.userId || null,
          parent.name || null,
          parent.phone,
          parent.note || null,
          parent.termsAgreedAt || null,
        ]);

      await queryRunner.query(
        `
        INSERT INTO parents (userId, name, phone, note, termsAgreedAt)
        VALUES ${parentPlaceholders} AS new_parent(userId, name, phone, note, termsAgreedAt)
        ON DUPLICATE KEY UPDATE 
          userId = new_parent.userId,
          name = new_parent.name,
          note = new_parent.note,
          termsAgreedAt = new_parent.termsAgreedAt
      `,
        parentValues,
      );
    }

    // 3단계: 생성된 부모 ID 매핑 (phone -> id)
    const parentPhoneNumbers = parentsToUpsert
      .map((p) => `'${p.phone}'`)
      .join(',');

    if (parentPhoneNumbers) {
      const parentRecords = (await queryRunner.query(`
        SELECT phone, id FROM parents WHERE phone IN (${parentPhoneNumbers})
      `)) as Array<{ phone: string; id: number }>;

      // 새로운 parent들의 ID를 매핑에 추가
      for (const record of parentRecords) {
        if (!parentMap.has(record.phone)) {
          parentMap.set(record.phone, record.id);
        }
      }
    }

    return parentMap;
  }

  /**
   * 학생 일괄 Upsert 처리
   */
  private async upsertStudents(
    queryRunner: QueryRunner,
    dtos: CreateStudentDto[],
    schoolId: number,
    parentMap: Map<string, number>,
  ): Promise<void> {
    if (dtos.length === 0) {
      return;
    }

    const studentPlaceholders = dtos
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ');

    const studentValues: (string | number | null)[] = dtos.flatMap((dto) => [
      dto.name || null,
      dto.parent.phone ? parentMap.get(dto.parent.phone) || null : null,
      schoolId,
      dto.grade || null,
      dto.class || null,
      dto.studentCode || null,
      dto.phone || null,
      dto.nextStop || null,
      dto.note || null,
      dto.status || 'ATTENDING',
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

  /**
   * DTO에서 부모 ID를 추출하는 헬퍼 메서드
   */
  private getParentId(
    dto: CreateStudentDto,
    parentMap: Map<string, number>,
  ): number | null {
    if (dto.parentId) {
      return dto.parentId;
    }

    if (dto.parent.phone) {
      return parentMap.get(dto.parent.phone) || null;
    }

    return null;
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
