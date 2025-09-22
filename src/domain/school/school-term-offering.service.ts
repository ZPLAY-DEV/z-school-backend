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
import { Group } from 'src/domain/group/entities/group.entity';
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
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
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

    // 실제 저장된 offerings를 다시 조회
    const savedOfferings = await this.offeringRepository.find({
      where: { schoolId, termId },
      order: { id: 'ASC' },
    });

    // Group의 offeringId 갱신
    await this._updateGroupOfferingIds(offerings, savedOfferings);

    return savedOfferings;
  }

  /**
   * Group의 offeringId를 갱신하는 private 메서드
   * @param originalOfferings makeOfferingsFromLessons에서 생성된 원본 offerings
   * @param savedOfferings DB에 저장된 offerings (ID 포함)
   */
  private async _updateGroupOfferingIds(
    originalOfferings: Offering[],
    savedOfferings: Offering[],
  ): Promise<void> {
    // groupId -> offeringId 매핑 생성
    const groupIdToOfferingIdMap = new Map<number, number>();

    for (const originalOffering of originalOfferings) {
      // 저장된 offering에서 해당하는 것을 찾기
      const savedOffering = savedOfferings.find(
        (saved) =>
          saved.schoolId === originalOffering.schoolId &&
          saved.termId === originalOffering.termId &&
          saved.lessonId === originalOffering.lessonId &&
          saved.groupName === originalOffering.groupName,
      );

      if (savedOffering) {
        // 해당 offering에 포함된 모든 groupId에 대해 offeringId 매핑
        for (const groupId of originalOffering.groupIds) {
          groupIdToOfferingIdMap.set(groupId, savedOffering.id);
        }
      }
    }

    // Group 엔티티들의 offeringId를 일괄 업데이트
    if (groupIdToOfferingIdMap.size > 0) {
      // 가장 효율적인 방법: 직접 SQL 업데이트
      const updatePromises = Array.from(groupIdToOfferingIdMap.entries()).map(
        ([groupId, offeringId]) =>
          this.groupRepository
            .createQueryBuilder()
            .update(Group)
            .set({ offeringId })
            .where('id = :groupId', { groupId })
            .execute(),
      );

      await Promise.all(updatePromises);
    }
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
      .leftJoinAndSelect('offering.lesson', 'lesson')
      .leftJoinAndSelect('offering.picks', 'picks')
      .leftJoinAndSelect('offering.bookings', 'bookings')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId });

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      searchableColumns: ['lessonName', 'groupName'],
      defaultSortBy: [],
      filterableColumns: {
        'lesson.categoryId': [FilterOperator.EQ, FilterOperator.IN],
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
    grade?: number,
    categoryId?: number,
    weekday?: string,
  ): Promise<Offering[]> {
    const queryBuilder = this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.lesson', 'lesson')
      // .leftJoinAndSelect('offering.picks', 'picks')
      // .leftJoinAndSelect('offering.bookings', 'bookings')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId });

    if (categoryId) {
      queryBuilder.andWhere('lesson.categoryId = :categoryId', { categoryId });
    }

    if (weekday) {
      // JSON 배열에서 특정 weekday를 가진 요소가 있는지 확인
      queryBuilder.andWhere(
        'JSON_SEARCH(times, "one", :weekday, NULL, "$[*].weekday") IS NOT NULL',
        {
          weekday,
        },
      );
    }

    const items = await queryBuilder.orderBy('offering.id', 'ASC').getMany();

    // 100개 미만의 작은 데이터셋에서는 FIND_IN_SET쿼리로 처리보다, 후처리 필터링이 더 효율적
    if (grade) {
      return items.filter((item: Offering) =>
        item.allowedGrades.includes(grade),
      );
    }

    return items;
  }

  async personalList(
    schoolId: number,
    termId: number,
    studentId: number,
    grade: number,
    categoryId?: number,
    booking?: boolean,
    weekday?: boolean,
  ): Promise<ResponseSchoolOfferingListDto[]> {
    const bookings = await this.bookingRepository.find({
      where: { studentId },
    });
    const selectedIds = bookings.map((v) => v.offeringId) || [];

    const queryBuilder = this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.lesson', 'lesson')
      .leftJoinAndSelect('lesson.groups', 'groups')
      .where('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId });

    if (categoryId) {
      queryBuilder.andWhere('lesson.categoryId = :categoryId', { categoryId });
    }

    const items: Offering[] = await queryBuilder
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

    const result = availableOfferings.map((offering) => {
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
        bitmasks: offering.bitmasks,
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

    if (!booking) {
      return result;
    }

    const filteredResult = result.filter((v) => v.booking !== null);

    // weekday 파라미터가 true인 경우 요일별로 그룹화하여 반환
    if (weekday) {
      const resultWithWeekday: ResponseSchoolOfferingListDto[] = [];

      for (const offering of filteredResult) {
        // offering의 times에서 weekday 정보 추출
        if (offering.times) {
          for (const timeRange of offering.times) {
            // 각 timeRange의 weekday에 해당하는 offering을 별도로 생성
            if (timeRange.weekday) {
              resultWithWeekday.push({
                ...offering,
                weekday: timeRange.weekday,
              });
            }
          }
        }
      }

      // 요일 순서대로 정렬 (월~토)
      const weekdayOrder = [
        Weekday.MONDAY,
        Weekday.TUESDAY,
        Weekday.WEDNESDAY,
        Weekday.THURSDAY,
        Weekday.FRIDAY,
        Weekday.SATURDAY,
      ];

      return resultWithWeekday.sort((a, b) => {
        const aIndex = weekdayOrder.indexOf(a.weekday!);
        const bIndex = weekdayOrder.indexOf(b.weekday!);
        return aIndex - bIndex;
      });
    }

    return filteredResult;
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
