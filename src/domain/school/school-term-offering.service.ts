import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { ResponseSchoolOfferingListDto } from 'src/domain/school/dto/response-school-offering-list.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import { makeOfferingsFromLessons } from 'src/helpers/offering.util';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermOfferingService {
  private readonly logger = new Logger(SchoolTermOfferingService.name);

  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(schoolId: number, termId: number): Promise<Offering[]> {
    const lessons = await this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.groups', 'group')
      .andWhere('lesson.termId = :termId', { termId })
      .orderBy('lesson.id', 'ASC')
      .getMany();

    const term = await this.termRepository.findOneOrFail({
      where: { id: termId },
    });

    const offerings = makeOfferingsFromLessons(
      termId,
      term.pickRule,
      schoolId,
      lessons,
    );

    // 기존 offerings 조회 (unique constraint 기준)
    const existingOfferings = await this.offeringRepository.find({
      where: { schoolId, termId },
    });

    // 기존 offerings와 새로운 offerings를 매핑하여 ID 설정
    const offeringsToUpsert = offerings.map((newOffering) => {
      const existing = existingOfferings.find(
        (existing) =>
          existing.schoolId === newOffering.schoolId &&
          existing.termId === newOffering.termId &&
          existing.lessonId === newOffering.lessonId &&
          existing.groupName === newOffering.groupName,
      );

      // 기존 offering이 있으면 ID를 설정하여 update가 되도록 함
      if (existing) {
        return { ...newOffering, id: existing.id };
      }

      // 새로운 offering이면 ID 없이 반환 (insert가 됨)
      return newOffering;
    });

    // upsert: 복합 유니크 키 기준으로 insert or update
    await this.offeringRepository.upsert(offeringsToUpsert, [
      'schoolId',
      'termId',
      'lessonId',
      'groupName',
    ]);

    // 실제 저장된 offerings를 다시 조회해서 반환
    return await this.offeringRepository.find({
      where: { schoolId, termId },
      order: { id: 'ASC' },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async infiniteList(
    query: PaginateQuery,
    schoolId: number,
    termId: number,
    studentId?: number,
  ): Promise<Paginated<Offering>> {
    const queryBuilder = this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.picks', 'picks')
      .leftJoinAndSelect('offering.bookings', 'bookings')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId });

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      searchableColumns: ['lessonName', 'groupName'],
      defaultSortBy: [],
      filterableColumns: {
        pickRule: [FilterOperator.EQ, FilterOperator.IN],
        allowedGrades: [FilterOperator.EQ, FilterOperator.IN],
      },
    });

    if (studentId) {
      const data = result.data.map((offering) => {
        const bookings = offering.bookings.filter(
          (booking) => booking.studentId === +studentId,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { bookings: _, ...offeringWithoutBookings } = offering;
        return {
          ...offeringWithoutBookings,
          booking: bookings.length > 0 ? bookings[0] : null,
        } as Offering & { booking: any };
      });

      return {
        ...result,
        data,
      };
    }

    return result;
  }

  async list(
    schoolId: number,
    termId: number,
    studentId: number,
    grade: number,
  ): Promise<ResponseSchoolOfferingListDto[]> {
    const bookings = await this.bookingRepository.find({
      where: { studentId },
    });
    const selectedIds = bookings.map((v) => v.offeringId) || [];

    const items: Offering[] = await this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.lesson', 'lesson')
      .leftJoinAndSelect('lesson.groups', 'groups')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .orderBy('offering.id', 'DESC')
      .getMany();
    const availableOfferings = items.filter((v) =>
      v.allowedGrades.includes(grade),
    );
    const accumulatedBitmasks = availableOfferings
      .filter((v) => selectedIds.includes(v.id))
      .reduce((acc, v) => {
        return [...acc, ...v.bitmasks];
      }, []);

    availableOfferings.map((v, i) =>
      console.log(`🚀 ~ ${v.id} bitmask ${i + 1}:`, v.bitmasks.join(',')),
    );
    console.log('🚀 ~ selectedIds:', selectedIds);
    console.log('🚀 ~ accumulatedBitmasks:', accumulatedBitmasks.join(','));

    return availableOfferings.map((offering) => {
      const totals = offering.lesson.groups.map(
        (g) => g.tuition + g.bookFee + g.materialFee,
      );
      const booking = bookings.find((v) => v.offeringId === offering.id);

      return {
        id: offering.id,
        schoolId: offering.schoolId,
        termId: offering.termId,
        lessonId: offering.lessonId,
        lessonName: offering.lessonName,
        groupName: offering.groupName,
        samName: offering.samName,
        capacity: offering.capacity,
        bookingCount: offering.bookingCount,
        prepicked: offering.prepicked,
        allowedGrades: offering.allowedGrades,
        pickRule: offering.pickRule,
        times: offering.times,
        prepickedStudentIds: offering.prepickedStudentIds,
        status: offering.status,
        totals,
        booking: booking || null,
        selectable: booking
          ? false
          : this.hasIntersection(accumulatedBitmasks, offering.bitmasks)
            ? false
            : true,
      } as ResponseSchoolOfferingListDto;
    });
  }

  async simpleList(
    schoolId: number,
    termId: number,
    grade: string | null = null,
  ): Promise<(Offering & { totals: number[] })[]> {
    const items = await this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.lesson', 'lesson')
      .leftJoinAndSelect('lesson.groups', 'groups')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .orderBy('offering.id', 'DESC')
      .getMany();

    if (grade) {
      return items
        .filter((item: Offering) => item.allowedGrades.includes(+grade))
        .map((v) => {
          const { lesson, ...offeringWithoutLesson } = v;
          const totals = lesson.groups.map(
            (g) => g.tuition + g.bookFee + g.materialFee,
          );
          return {
            ...offeringWithoutLesson,
            totals,
          } as Offering & { totals: number[] };
        });
    }

    return items.map((v) => {
      const { lesson, ...offeringWithoutLesson } = v;
      const totals = lesson.groups.map(
        (g) => g.tuition + g.bookFee + g.materialFee,
      );
      return {
        ...offeringWithoutLesson,
        totals,
      } as Offering & { totals: number[] };
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
  async deleteAll(schoolId: number, termId: number): Promise<number> {
    try {
      const result = await this.offeringRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const result = await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from(Offering)
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

  /**
   * 두 배열 간의 교집합이 있는지 확인
   * @param pool 첫 번째 배열
   * @param target 두 번째 배열
   * @returns 교집합이 있으면 true, 없으면 false
   */
  private hasIntersection(pool: number[], target: number[]) {
    const set = new Set(pool);
    return target.some((v) => set.has(v));
  }
}
