import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateTermDto } from 'src/domain/term/dto/update-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TermService {
  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateTermDto): Promise<Term> {
    // 1. 학교 존재 여부 조회
    const school = await this.schoolRepository.findOne({
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // 2. 학기 중복 여부 조회
    const existingTerm = await this.termRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        termName: dto.termName,
        schoolYear: dto.schoolYear,
      },
    });

    if (existingTerm) {
      throw new BadRequestException('Duplicate term');
    }

    // 3. 생성
    const newTerm = this.termRepository.create({
      ...dto,
      schoolName: dto.schoolName ?? school.name,
    });
    return this.termRepository.save(newTerm);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findById(id: number, relations: string[] = []): Promise<Term> {
    try {
      return relations.length > 0
        ? await this.termRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.termRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException('Term not found');
    }
  }

  // async infiniteList(
  //   schoolId: number,
  //   query: PaginateQuery,
  // ): Promise<Paginated<Term>> {
  //   const queryBuilder = this.termRepository
  //     .createQueryBuilder('term')
  //     .where('term.schoolId = :schoolId', { schoolId });

  //   return await paginate(query, queryBuilder, {
  //     sortableColumns: ['schoolYear', 'start'],
  //     searchableColumns: ['schoolYear', 'termName'],
  //     defaultSortBy: [
  //       ['schoolYear', 'ASC'],
  //       ['start', 'ASC'],
  //     ],
  //     filterableColumns: {
  //       schoolYear: [FilterOperator.EQ],
  //       name: [FilterOperator.EQ, FilterOperator.ILIKE],
  //     },
  //   });
  // }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateTermDto): Promise<Term> {
    const existingTerm = await this.findById(id);

    // 날짜 validation: termRange와 bookingRange 겹침 검사
    this.validateTermBookingDateRange(dto, existingTerm);

    // pickRule 변경 시 비즈니스 로직 검증
    if (dto.pickRule && existingTerm.pickRule !== dto.pickRule) {
      if (existingTerm.isOfferingReady) {
        const now = new Date();
        if (existingTerm.bookingStart && existingTerm.bookingStart <= now) {
          throw new BadRequestException(
            '수강신청이 시작된 후에는 확정방식을 변경할 수 없습니다',
          );
        }
        await this.offeringRepository.update(
          { termId: id },
          { pickRule: dto.pickRule },
        );
      }
    }

    const term = await this.termRepository.preload({
      id,
      ...dto,
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    // 업데이트
    return this.termRepository.save(term);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async softRemove(id: number): Promise<Term> {
    const term = await this.findById(id, ['lessons']);
    if (term.lessons.length > 0) {
      throw new BadRequestException('Term has lessons');
    }
    return await this.termRepository.softRemove(term);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Methods
  //? ---------------------------------------------------------------------- ?//

  /**
   * 학기 기간과 수강신청 기간의 겹침을 검사합니다.
   * termRange (start~end)는 bookingRange (bookingStart~bookingEnd)와 겹치지 않고 이후에 존재해야 합니다.
   */
  private validateTermBookingDateRange(
    dto: UpdateTermDto,
    existingTerm: Term,
  ): void {
    // 업데이트할 날짜 정보를 결정 (DTO에서 제공되지 않으면 기존 값 사용)
    const termStart = dto.start || existingTerm.start;
    const termEnd = dto.end || existingTerm.end;
    const bookingStart =
      dto.bookingStart !== undefined
        ? dto.bookingStart
        : existingTerm.bookingStart;
    const bookingEnd =
      dto.bookingEnd !== undefined ? dto.bookingEnd : existingTerm.bookingEnd;

    // 수강신청 기간이 설정되지 않은 경우는 검사하지 않음
    if (!bookingStart || !bookingEnd) {
      return;
    }

    // termRange와 bookingRange가 겹치는지 검사
    const termStartDate = new Date(termStart);
    const termEndDate = new Date(termEnd);
    const bookingStartDate = new Date(bookingStart);
    const bookingEndDate = new Date(bookingEnd);

    // 날짜 범위 겹침 검사: 두 기간이 겹치는 경우
    const isOverlapping =
      termStartDate <= bookingEndDate && termEndDate >= bookingStartDate;

    if (isOverlapping) {
      throw new BadRequestException(
        '수강신청기간은 학기시작일 이전만 가능합니다.',
      );
    }
  }
}
