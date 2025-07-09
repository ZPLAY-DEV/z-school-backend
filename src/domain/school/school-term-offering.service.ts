import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Weekday } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
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

  // 한국어 요일을 영어 요일로 매핑하는 헬퍼 함수
  private getEnglishWeekday(koreanWeekday: Weekday): string {
    const weekdayMap: Record<Weekday, string> = {
      [Weekday.MONDAY]: 'MON',
      [Weekday.TUESDAY]: 'TUE',
      [Weekday.WEDNESDAY]: 'WED',
      [Weekday.THURSDAY]: 'THU',
      [Weekday.FRIDAY]: 'FRI',
      [Weekday.SATURDAY]: 'SAT',
      [Weekday.SUNDAY]: 'SUN',
    };
    return weekdayMap[koreanWeekday];
  }

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
    schoolId: number,
    termId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Offering>> {
    const queryBuilder = this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.picks', 'picks')
      .leftJoinAndSelect('offering.bookings', 'bookings')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId });

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      searchableColumns: ['lessonName', 'groupName'],
      defaultSortBy: [],
      filterableColumns: {
        pickRule: [FilterOperator.EQ, FilterOperator.IN],
        allowedGrades: [FilterOperator.EQ, FilterOperator.IN],
      },
    });
  }

  async list(
    schoolId: number,
    termId: number,
    grade: string | null = null,
  ): Promise<Offering[]> {
    const items = await this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.picks', 'picks')
      .leftJoinAndSelect('offering.bookings', 'bookings')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .orderBy('offering.id', 'DESC')
      .getMany();

    if (grade) {
      return items.filter((item: Offering) =>
        item.allowedGrades.includes(+grade),
      );
    }

    return items;
  }

  async listBookings(
    schoolId: number,
    termId: number,
    userId: number,
  ): Promise<Record<string, Offering[]>> {
    // Student가 해당 학교, 학기에서 신청한 모든 bookings 조회
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.studentId = :userId', { userId })
      .andWhere('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .getMany();

    // 요일별 결과 객체 초기화
    const result: Record<string, Offering[]> = {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
    };

    // 각 booking의 offering을 요일별로 분류
    for (const booking of bookings) {
      const offering = booking.offering;

      // offering의 times 배열을 순회하며 각 요일에 offering 추가
      for (const timeRange of offering.times) {
        const englishWeekday = this.getEnglishWeekday(timeRange.weekday);

        // 중복 방지를 위해 이미 추가되지 않은 경우만 추가
        if (
          !result[englishWeekday].some(
            (existingOffering) => existingOffering.id === offering.id,
          )
        ) {
          result[englishWeekday].push(offering);
        }
      }
    }

    return result;
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
}
