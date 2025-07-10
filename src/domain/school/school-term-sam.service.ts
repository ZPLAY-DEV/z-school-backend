import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { endOfWeek, startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { getEnglishWeekday } from 'src/helpers/date';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermSamService {
  private readonly logger = new Logger(SchoolTermSamService.name);

  constructor(
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number, termId: number): Promise<Sam[]> {
    const result = await this.samRepository
      .createQueryBuilder('sam')
      .innerJoin('sam.contracts', 'contract')
      .innerJoin('contract.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin('lesson.term', 'term')
      .where('sam.schoolId = :schoolId', { schoolId })
      .andWhere('term.id = :termId', { termId })
      .distinct(true)
      .getMany();

    this.logger.debug(
      `School ${schoolId}, Term ${termId}의 학생 수: ${result.length}`,
    );

    return result;
  }

  async listBookings(
    schoolId: number,
    termId: number,
    samId: number,
  ): Promise<Booking[]> {
    return await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.samId = :samId', { samId })
      .andWhere('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .getMany();
  }

  async listBookingStats(
    schoolId: number,
    termId: number,
    samId: number,
  ): Promise<Record<string, Offering[]>> {
    // Sam가 해당 학교, 학기에서 신청한 모든 bookings 조회
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.samId = :samId', { samId })
      .andWhere('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .getMany();

    // 요일별 결과 객체 초기화
    const result: Record<string, Offering[]> = {
      SUN: [],
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
        const englishWeekday = getEnglishWeekday(timeRange.weekday);
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

  //? 학생의 수업일 조회
  async listSchooldays(
    schoolId: number,
    termId: number,
    samId: number,
  ): Promise<Schoolday[]> {
    const queryBuilder = this.samRepository
      .createQueryBuilder('sam')
      .leftJoinAndSelect('sam.contracts', 'contract')
      .leftJoinAndSelect('contract.group', 'group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .where('sam.id = :samId', { samId })
      .andWhere('sam.schoolId = :schoolId', { schoolId })
      .andWhere('contract.termId = :termId', { termId })
      .andWhere('contract.endedBy IS NULL');

    const sam = await queryBuilder.getOne();

    if (!sam) {
      throw new NotFoundException('Sam not found');
    }

    // 학생의 contracts에서 모든 schooldays 추출
    const schooldays: Schoolday[] = [];
    sam.contracts?.forEach((contract) => {
      if (contract.group && contract.group.schooldays) {
        schooldays.push(...contract.group.schooldays);
      }
    });

    // 중복 제거 (같은 schoolday가 여러 group에 있을 수 있다면...)
    // const uniqueSchooldays = schooldays.filter(
    //   (schoolday, index, self) =>
    //     index === self.findIndex((s) => s.id === schoolday.id),
    // );

    return schooldays;
  }

  async listWeeklySchooldays(
    schoolId: number,
    termId: number,
    samId: number,
    date?: string,
  ): Promise<Record<string, Schoolday[]>> {
    // 1. from 파라미터 처리 (null이면 오늘 날짜)
    const targetDate = date ? new Date(date) : new Date();
    const kstDate = toZonedTime(targetDate, 'Asia/Seoul');

    // 2. 해당 주의 일요일과 토요일 계산
    const weekStart = startOfWeek(kstDate, { weekStartsOn: 0 }); // 일요일부터 시작
    const weekEnd = endOfWeek(kstDate, { weekStartsOn: 0 }); // 토요일까지

    // 3. 학생의 schooldays 조회 (해당 주에 속하는 것만, group 관계 포함)
    const schooldays = await this.samRepository
      .createQueryBuilder('sam')
      .leftJoinAndSelect('sam.contracts', 'contract')
      .leftJoinAndSelect('contract.group', 'group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .where('sam.id = :samId', { samId })
      .andWhere('sam.schoolId = :schoolId', { schoolId })
      .andWhere('contract.termId = :termId', { termId })
      .andWhere('contract.endedBy IS NULL')
      .andWhere('schoolday.startsAt BETWEEN :weekStart AND :weekEnd', {
        weekStart,
        weekEnd,
      })
      .getOne();

    if (!schooldays) {
      throw new NotFoundException('Sam not found');
    }

    // 4. 요일별로 그룹화
    const result: Record<string, Schoolday[]> = {
      SUN: [],
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
    };

    // 학생의 contracts에서 모든 schooldays 추출 및 그룹화
    schooldays.contracts?.forEach((contract) => {
      if (contract.group && contract.group.schooldays) {
        contract.group.schooldays.forEach((schoolday) => {
          // schoolday의 시작 시각으로 요일 결정
          const dayOfWeek = schoolday.startsAt.getDay();
          const weekdayKey = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][
            dayOfWeek
          ];

          // group 관계 설정 (이미 포함되어 있지만 명시적으로 설정)
          schoolday.group = contract.group;

          result[weekdayKey].push(schoolday);
        });
      }
    });

    // 5. 각 요일별로 시간 순으로 정렬
    Object.keys(result).forEach((day) => {
      result[day].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    });

    return result;
  }
}
