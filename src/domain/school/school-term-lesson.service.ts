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

      const [, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r] =
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
      lessonGroups.get(lessonName)!.push(item);
    });

    // CreateLessonDto[]로 변환
    const dtos: CreateLessonDto[] = [];

    lessonGroups.forEach((groupItems, lessonName) => {
      // 첫 번째 아이템에서 공통 정보 추출
      const firstItem = groupItems[0];

      const dto: CreateLessonDto = {
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
        groups: groupItems.map((item) => ({
          instructorName: item.instructorName,
          instructorPhone: item.instructorPhone,
          groupName: item.groupName,
          weekday: item.weekday,
          start: item.start,
          end: item.end,
          allowedGrades: item.allowedGrades,
          location: item.location,
          capacity: item.capacity,
          tuition: item.tuition,
          bookFee: item.bookFee,
          materialFee: item.materialFee,
          note: item.note,
        })),
      };

      dtos.push(dto);
    });

    console.log(`🟢🟢🟢🟢🟢🟢🟢🟢`, JSON.stringify(dtos, null, 2));

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
    const templateUrl =
      'https://cdn.xn--ov3b17fd5n5vf.kr/excels/lessons-v3.xlsx';
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

    const lessons = await this.lessonRepository.find({
      where: { schoolId: schoolId, termId: termId },
      relations: ['term', 'groups', 'groups.sam', 'groups.sam.instructor'],
      order: {
        lessonName: 'ASC',
      },
    });

    lessons.forEach((lesson, index) => {
      lesson.groups.forEach((group) => {
        const row = sheet.insertRow(3 + index, []);

        console.log(
          `${lesson.lessonName} - ${group.groupName} ${group.weekday}`,
        );

        row.getCell(1).value = lesson.term.termName;
        row.getCell(2).value = lesson.lessonName;
        row.getCell(3).value = this._getCategoryNameFromCategoryId(
          lesson.categoryId,
        );
        row.getCell(4).value = lesson.frequency;
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).value = group.groupName;
        row.getCell(6).value = group.weekday;
        row.getCell(7).value = group.start;
        row.getCell(8).value = group.end;
        row.getCell(9).value = getMin(
          group.allowedGrades.split(',').map(Number),
        );
        row.getCell(9).alignment = { horizontal: 'center' };
        row.getCell(10).value = getMax(
          group.allowedGrades.split(',').map(Number),
        );
        row.getCell(10).alignment = { horizontal: 'center' };
        row.getCell(11).value = group.samName;
        row.getCell(12).value = formatPhone(group.sam.instructor.phone);
        row.getCell(13).value = group.location;
        row.getCell(14).value = group.capacity;
        row.getCell(15).value = group.tuition;
        row.getCell(16).value = group.bookFee;
        row.getCell(17).value = group.materialFee;
        row.getCell(18).value = group.note;
      });
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
          picks: true,
        },
        category: true,
      },
      sortableColumns: ['id', 'lessonName', 'termId', 'groups.weekday'],
      searchableColumns: ['lessonName'],
      defaultSortBy: [
        ['schoolId', 'DESC'],
        ['id', 'DESC'],
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
