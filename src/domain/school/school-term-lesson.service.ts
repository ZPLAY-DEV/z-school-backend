import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import * as ExcelJS from 'exceljs';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { ClassStatus } from 'src/common/enums';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/domain/lesson/dto/update-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonCoreService } from 'src/domain/lesson/lesson-core.service';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { getMax, getMin } from 'src/helpers/parse';
import { formatPhone } from 'src/helpers/phone';
import { Repository } from 'typeorm';
const categories = ['맞춤형', '돌봄', '선택형(무료)', '선택형(유료)'];

@Injectable()
export class SchoolTermLessonService {
  private readonly logger = new Logger(SchoolTermLessonService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    private readonly lessonCoreService: LessonCoreService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //! create() 의 모든 로직이 무사히 실행되는지 persist 하지 않고, 실험해보기 위한 것이
  //! dryrun() 인데, 그냥 중복 강좌 레코드가 있는지만 확인하고 말았다. ㅠ.ㅠ
  async createBulkDryrun(dtos: CreateLessonDto[]): Promise<Lesson[]> {
    return await this.checkExistingLessons(dtos);
  }

  async createBulk(
    schoolId: number,
    termId: number,
    dtos: CreateLessonDto[],
  ): Promise<number> {
    const lessons: Lesson[] = [];

    // performs validations only here and let the core service handle the rest
    //? 1단계) 학교 정보 확인
    const school = await this.schoolRepository.findOne({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    //? 2단계) 학기 정보 확인
    const term = await this.termRepository.findOne({
      where: { id: termId },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    for (const dto of dtos) {
      const lesson = await this.lessonCoreService.create(school, term, dto);
      lessons.push(lesson);
    }
    return lessons.length;
  }

  /**
   * Check for existing lessons that would be overwritten based on the compound unique key
   * (termId, schoolId, lessonName)
   */
  private async checkExistingLessons(
    dtos: CreateLessonDto[],
  ): Promise<Lesson[]> {
    // Extract unique key combinations from DTOs
    const uniqueKeyCombinations = dtos.map((dto) => ({
      termId: dto.termId,
      schoolId: dto.schoolId,
      lessonName: dto.lessonName,
    }));

    // Find existing lessons that match any of these combinations
    const existingLessons = await this.lessonRepository.find({
      where: uniqueKeyCombinations.map((combo) => ({
        termId: combo.termId,
        schoolId: combo.schoolId,
        lessonName: combo.lessonName,
      })),
      relations: {
        category: true,
        groups: {
          contracts: {
            sam: true,
          },
        },
      },
    });

    // No existing lessons found means no records will be overwritten
    if (existingLessons.length === 0) {
      return [];
    }

    return existingLessons;
  }

  private _getCategoryIdFromCategoryName(categoryName: string): number {
    const index = categories.indexOf(categoryName);
    return index + 1;
  }

  private _getCategoryNameFromCategoryId(categoryId: number): string {
    const index = categoryId - 1;
    return categories[index];
  }

  async parseExcel(
    schoolId: number,
    termId: number,
    file: Express.Multer.File,
  ): Promise<CreateLessonDto[]> {
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error - Buffer 타입 호환성 이슈
    await workbook.xlsx.load(file.buffer);
    const term = await this.termRepository.findOne({
      where: { id: termId },
      relations: {
        school: true,
      },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // 첫번째 sheet
    const worksheet = workbook.worksheets[0];
    const items: any[] = [];

    // 실제 데이터 추출 (헤더 아래 행부터 시작)
    worksheet.eachRow((row, index) => {
      if (index < 3) return;

      const [, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s] =
        row.values as any[]; // row.values[0] 은 항상 undefined

      if (
        !a ||
        !b ||
        !c ||
        !d ||
        !e ||
        !f ||
        !g ||
        !h ||
        !i ||
        !j ||
        !k ||
        !l ||
        !m ||
        !n
      )
        return;

      const termName = a ? a.toString().trim() : null;

      // term.name과 Excel에서 읽은 termName이 일치하지 않으면 오류 발생
      if (termName && termName !== term.termName) {
        throw new BadRequestException(
          `Excel 파일의 학기명 "${termName}"이 요청된 학기명 "${term.termName}"과 일치하지 않습니다.`,
        );
      }
      const lessonName = b ? b.toString().trim() : null;
      const categoryName = c as string;
      const categoryId = this._getCategoryIdFromCategoryName(categoryName);
      const frequency = d ? Number(d) : 0;
      const groupName = e.toString().trim();
      const weekday = f.toString().trim();
      const start = g.toString().trim();
      const end = h.toString().trim();
      const allowedGrades = `${i}~${j}`;
      const instructorName = k.toString().trim();
      const instructorPhone = l.toString().trim();
      const location = m.toString().trim();
      const capacity = n ? Number(n) : 0;
      const tuition = o ? Number(o) : 0;
      const bookFee = p ? Number(p) : 0;
      const materialFee = q ? Number(q) : 0;
      const note = r ? r.toString().trim() : null;
      const status = s ? s.toString().trim() : null;

      items.push({
        schoolId,
        termId,
        termName,
        lessonName,
        categoryId,
        categoryName,
        frequency,
        groupName,
        weekday,
        start,
        end,
        allowedGrades,
        instructorName,
        instructorPhone,
        location,
        capacity,
        tuition,
        bookFee,
        materialFee,
        note,
        status,
      });
    });

    // groupName으로 오름차순 정렬
    const sortedData = items.sort((a: any, b: any) =>
      (a.groupName as string).localeCompare(b.groupName as string),
    );

    // 같은 lessonName끼리 그룹화
    const lessonGroups = new Map<string, any[]>();

    sortedData.forEach((item) => {
      const lessonName = item.lessonName as string;
      if (!lessonGroups.has(lessonName)) {
        lessonGroups.set(lessonName, []);
      }

      if (item.status !== '폐강') {
        lessonGroups.get(lessonName)!.push(item);
      }
    });

    // CreateLessonDto[]로 변환
    const dtos: CreateLessonDto[] = [];
    const validationErrors: Array<{
      row: number;
      lessonName: string;
      errors: string[];
    }> = [];

    lessonGroups.forEach((groupItems, lessonName) => {
      // 첫 번째 아이템에서 공통 정보 추출
      const firstItem = groupItems[0];

      const lessonData = {
        schoolId: firstItem.schoolId,
        termId: firstItem.termId,
        categoryId: firstItem.categoryId,
        lessonName: lessonName,
        description: firstItem.categoryName,
        start: term.start,
        end: term.end,
        frequency: firstItem.frequency,
        bookFees: [],
        materialFees: [],
        groups: groupItems.map((v) => ({
          instructorName: v.instructorName,
          instructorPhone: v.instructorPhone,
          groupName: v.groupName,
          weekday: v.weekday,
          start: v.start,
          end: v.end,
          allowedGrades: v.allowedGrades,
          location: v.location,
          capacity: v.capacity,
          tuition: v.tuition,
          bookFee: v.bookFee,
          materialFee: v.materialFee,
          note: v.note,
        })),
      };

      dtos.push(lessonData);
    });

    // validation 적용
    for (let i = 0; i < dtos.length; i++) {
      const lessonData = dtos[i];

      // plainToClass를 사용하여 DTO 인스턴스로 변환
      const lessonDto = plainToClass(CreateLessonDto, lessonData);

      // validation 실행
      const errors = await validate(lessonDto);

      if (errors.length > 0) {
        const errorMessages = errors.flatMap((error) =>
          Object.values(error.constraints || {}),
        );

        validationErrors.push({
          row: i + 1, // 강좌 순서
          lessonName: lessonData.lessonName,
          errors: errorMessages,
        });

        this.logger.warn(
          `Validation failed for lesson "${lessonData.lessonName}": ${errorMessages.join(', ')}`,
        );
      }
    }

    // validation 에러가 있으면 상세한 에러 메시지와 함께 예외 발생
    if (validationErrors.length > 0) {
      const errorSummary = validationErrors
        .map(
          ({ row, lessonName, errors }) =>
            `강좌 ${row} (${lessonName}): ${errors.join(', ')}`,
        )
        .join('\n');

      throw new BadRequestException(
        `${validationErrors.length}개 강좌에서 입력오류가 발견됩니다:\n${errorSummary}`,
      );
    }

    this.logger.log(
      `Successfully parsed and validated ${dtos.length} lessons from Excel file`,
    );

    return dtos;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async generateExcel(
    schoolId: number,
    termId: number,
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('강좌 리스트');

    // 제목 행 추가 (셀 병합)
    const titleRow = worksheet.addRow(['강좌 리스트']);
    worksheet.mergeCells('A1:S1');
    titleRow.getCell(1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    titleRow.getCell(1).font = { bold: true, size: 16 };

    // 컬럼 헤더 추가
    const headerRow = worksheet.addRow([
      '학기명',
      '강좌명',
      '강좌분류',
      '주당횟수',
      '분반명',
      '요일',
      '시작시간',
      '종료시간',
      '수강학년MIN',
      '수강학년MAX',
      '강사이름',
      '연락처',
      '수업장소',
      '정원',
      '학기수강료',
      '교재비',
      '재료비',
      '비고',
      '폐강여부',
    ]);

    // 헤더 스타일링
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 마지막 4개 칼럼은 선택입력사항임을 흐리게 표시
      if (colNumber >= 15) {
        cell.font = { bold: true, color: { argb: 'FF808080' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' },
        };
      }
    });

    // 강좌 데이터 조회
    const lessons = await this.lessonRepository.find({
      where: { schoolId: schoolId, termId: termId },
      relations: ['term', 'groups', 'groups.sam', 'groups.sam.instructor'],
      order: {
        lessonName: 'ASC',
      },
    });

    let rowIndex = 3;
    lessons.forEach((lesson) => {
      lesson.groups.forEach((group) => {
        const row = worksheet.addRow([
          lesson.term.termName,
          lesson.lessonName,
          this._getCategoryNameFromCategoryId(lesson.categoryId),
          lesson.frequency,
          group.groupName,
          group.weekday,
          group.start,
          group.end,
          getMin(group.allowedGrades.split(',').map(Number)),
          getMax(group.allowedGrades.split(',').map(Number)),
          group.samName,
          formatPhone(group.sam.instructor.phone),
          group.location,
          group.capacity,
          group.tuition,
          group.bookFee,
          group.materialFee,
          group.note || '',
          group.status === ClassStatus.CANCELED ? '폐강' : '',
        ]);

        // 폐강된 경우 취소선 표기
        if (group.status === ClassStatus.CANCELED) {
          for (let i = 1; i <= 14; i++) {
            row.getCell(i).font = { strike: true };
          }
        }

        // 주당횟수, 수강가능학년은 가운데 정렬
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(9).alignment = { horizontal: 'center' };
        row.getCell(10).alignment = { horizontal: 'center' };
        row.getCell(14).alignment = { horizontal: 'center' };
        row.getCell(19).alignment = { horizontal: 'center' };

        // 마지막 5개 칼럼은 선택입력사항임을 흐리게 표시 (사실 폐강여부는 입력사항은 아님)
        for (let i = 15; i <= 19; i++) {
          const cell = row.getCell(i);
          cell.font = { color: { argb: 'FF808080' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F8F8' },
          };
        }

        rowIndex++;
      });
    });

    // 강좌분류 칼럼에 드롭다운 메뉴 설정
    const categoryValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"맞춤형,돌봄,선택형(유료),선택형(무료)"'],
    };
    (worksheet as any).dataValidations.add(
      'C3:C' + (rowIndex - 1),
      categoryValidation,
    );

    // 컬럼 너비 자동 조정
    worksheet.columns.forEach((column, index) => {
      switch (index) {
        case 0: // 학기명
          column.width = 10;
          break;
        case 1: // 강좌명
          column.width = 15;
          break;
        case 2: // 강좌분류
          column.width = 15;
          break;
        case 3: // 주당횟수
          column.width = 10;
          break;
        case 4: // 분반명
          column.width = 20;
          break;
        case 5: // 요일
          column.width = 8;
          break;
        case 6: // 시작시간
        case 7: // 종료시간
          column.width = 10;
          break;
        case 8: // 수강학년MIN
        case 9: // 수강학년MAX
          column.width = 10;
          break;
        case 10: // 강사이름
          column.width = 12;
          break;
        case 11: // 연락처
          column.width = 15;
          break;
        case 12: // 수업장소
          column.width = 15;
          break;
        case 13: // 정원
        case 18:
          column.width = 8;
          break;
        case 14: // 학기수강료
        case 15: // 교재비
        case 16: // 재료비
          column.width = 10;
          break;
        case 17: // 비고
          column.width = 20;
          break;
        default:
          column.width = 15;
          break;
      }
    });

    return workbook;
  }

  async infiniteList(
    schoolId: number,
    termId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Lesson>> {
    const queryBuilder = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.category', 'category')
      .where('lesson.schoolId = :schoolId', { schoolId })
      .andWhere('lesson.termId = :termId', { termId });

    return await paginate(query, queryBuilder, {
      relations: {
        groups: {
          contracts: { sam: true },
          // picks: true,
        },
        category: true,
      },
      sortableColumns: ['id', 'lessonName', 'termId', 'groups.weekday'],
      searchableColumns: ['lessonName'],
      defaultSortBy: [
        ['id', 'ASC'],
        // ['groups.id', 'ASC'],
      ],
      filterableColumns: {
        termId: [FilterOperator.EQ],
        categoryId: [FilterOperator.EQ],
        'category.name': [FilterOperator.EQ, FilterOperator.IN],
        'category.slug': [FilterOperator.EQ, FilterOperator.IN],
        'groups.weekday': [FilterOperator.EQ, FilterOperator.IN],
        lessonName: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }

  async list(schoolId: number, termId: number): Promise<Lesson[]> {
    return this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.category', 'category')
      .leftJoinAndSelect('lesson.groups', 'group')
      .leftJoinAndSelect('group.sam', 'sam')
      .where('lesson.schoolId = :schoolId', { schoolId })
      .andWhere('lesson.termId = :termId', { termId })
      .orderBy('lesson.id', 'DESC')
      .getMany();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateLessonDto): Promise<Lesson> {
    return await this.lessonCoreService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async deleteAll(schoolId: number, termId: number): Promise<number> {
    try {
      const result = await this.lessonRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const result = await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from(Lesson)
            .where('schoolId = :schoolId AND termId = :termId', {
              schoolId,
              termId,
            })
            .execute();

          return result.affected;
        },
      );

      return result || 0;
    } catch (error) {
      this.logger?.error(error);
      throw new BadRequestException(
        `Processing condition not met: ${error.message}`,
      );
    }
  }
}
