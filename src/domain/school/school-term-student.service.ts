import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { endOfWeek, startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  FilterOperator,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Weekday } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { getEnglishWeekday } from 'src/helpers/date';
import { Repository } from 'typeorm';
import { ResponseSchoolTermStudentBookingsDto } from './dto/response-school-term-student-bookings.dto';

@Injectable()
export class SchoolTermStudentService {
  private readonly logger = new Logger(SchoolTermStudentService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(schoolId: number, termId: number): Promise<Student[]> {
    const result = await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.picks', 'pick')
      .innerJoin('pick.group', 'group')
      .innerJoin('group.lesson', 'lesson')
      .innerJoin('lesson.term', 'term')
      .where('student.schoolId = :schoolId', { schoolId })
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
    studentId: number,
  ): Promise<ResponseSchoolTermStudentBookingsDto[]> {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.studentId = :studentId', { studentId })
      .andWhere('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .getMany();

    // 요일별로 그룹화 (월~토만)
    const weekdayGroups: Partial<Record<Weekday, Booking[]>> = {
      [Weekday.MONDAY]: [],
      [Weekday.TUESDAY]: [],
      [Weekday.WEDNESDAY]: [],
      [Weekday.THURSDAY]: [],
      [Weekday.FRIDAY]: [],
      [Weekday.SATURDAY]: [],
    };

    for (const booking of bookings) {
      const offering = booking.offering;

      // offering의 times에서 weekday 정보 추출
      if (offering.times) {
        for (const timeRange of offering.times) {
          // 각 timeRange의 weekday에 해당하는 그룹에 booking 추가
          if (timeRange.weekday && weekdayGroups[timeRange.weekday]) {
            weekdayGroups[timeRange.weekday]!.push(booking);
          }
        }
      }
    }

    // 월요일부터 토요일까지 순차적으로 Response DTO 생성
    const weekdayOrder = [
      Weekday.MONDAY,
      Weekday.TUESDAY,
      Weekday.WEDNESDAY,
      Weekday.THURSDAY,
      Weekday.FRIDAY,
      Weekday.SATURDAY,
    ];

    return weekdayOrder.map(
      (weekday) =>
        new ResponseSchoolTermStudentBookingsDto(
          weekday,
          weekdayGroups[weekday] || [],
        ),
    );
  }

  // 신청한 booking 정보 보기 (요일별로 분류)
  async listBookingStats(
    schoolId: number,
    termId: number,
    studentId: number,
  ): Promise<Record<string, Offering[]>> {
    // Student가 해당 학교, 학기에서 신청한 모든 bookings 조회
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.studentId = :studentId', { studentId })
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
    studentId: number,
  ): Promise<Schoolday[]> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .leftJoinAndSelect('schoolday.group', 'schooldayGroup') // 추가: schoolday의 group 관계 로드
      .where('student.id = :studentId', { studentId })
      .andWhere('student.schoolId = :schoolId', { schoolId })
      .andWhere('pick.termId = :termId', { termId })
      .andWhere('pick.endedBy IS NULL');

    const student = await queryBuilder.getOne();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 학생의 picks에서 모든 schooldays 추출 (group 관계 포함됨)
    const schooldays: Schoolday[] = [];
    student.picks?.forEach((pick) => {
      if (pick.group && pick.group.schooldays) {
        pick.group.schooldays.forEach((schoolday) => {
          schooldays.push(schoolday);
        });
      }
    });

    // 시간순 정렬
    schooldays.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    return schooldays;
  }

  async listWeeklySchooldays(
    schoolId: number,
    termId: number,
    studentId: number,
    date?: string,
  ): Promise<Record<string, Schoolday[]>> {
    try {
      // 1. date 파라미터 처리 (null이면 오늘 날짜)
      const targetDate = date ? new Date(date) : new Date();

      // 2. 안전한 시간대 처리
      let kstDate: Date;
      try {
        kstDate = toZonedTime(targetDate, 'Asia/Seoul');
      } catch (timezoneError) {
        this.logger.warn('시간대 변환 실패, 로컬 시간 사용:', timezoneError);
        // 시간대 변환 실패시 로컬 시간 사용
        kstDate = targetDate;
      }

      // 3. 해당 주의 일요일과 토요일 계산
      const weekStart = startOfWeek(kstDate, { weekStartsOn: 0 }); // 일요일부터 시작
      const weekEnd = endOfWeek(kstDate, { weekStartsOn: 0 }); // 토요일까지

      // 4. 먼저 학생 존재 여부 확인 (주별 필터링 없이)
      const student = await this.studentRepository
        .createQueryBuilder('student')
        .leftJoinAndSelect('student.picks', 'pick')
        .leftJoinAndSelect('pick.group', 'group')
        .leftJoinAndSelect('group.schooldays', 'schoolday')
        .leftJoinAndSelect('schoolday.group', 'schooldayGroup')
        .where('student.id = :studentId', { studentId })
        .andWhere('student.schoolId = :schoolId', { schoolId })
        .andWhere('pick.termId = :termId', { termId })
        .andWhere('pick.endedBy IS NULL')
        .getOne();

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // 5. 요일별로 그룹화
      const result: Record<string, Schoolday[]> = {
        SUN: [],
        MON: [],
        TUE: [],
        WED: [],
        THU: [],
        FRI: [],
        SAT: [],
      };

      // 6. 학생의 picks에서 해당 주의 schooldays만 추출 및 그룹화
      student.picks?.forEach((pick) => {
        if (pick.group && pick.group.schooldays) {
          pick.group.schooldays.forEach((schoolday) => {
            // 해당 주에 속하는 schoolday만 필터링
            if (
              schoolday.startsAt >= weekStart &&
              schoolday.startsAt <= weekEnd
            ) {
              // schoolday의 시작 시각으로 요일 결정
              const dayOfWeek = schoolday.startsAt.getDay();
              const weekdayKey = [
                'SUN',
                'MON',
                'TUE',
                'WED',
                'THU',
                'FRI',
                'SAT',
              ][dayOfWeek];

              result[weekdayKey].push(schoolday);
            }
          });
        }
      });

      // 7. 각 요일별로 시간 순으로 정렬
      Object.keys(result).forEach((day) => {
        result[day].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      });

      return result;
    } catch (error) {
      this.logger.error('listWeeklySchooldays 오류:', error);
      throw error;
    }
  }

  //? 학생의 수강중인 반 조회
  async listGroups(
    schoolId: number,
    termId: number,
    studentId: number,
  ): Promise<Group[]> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .leftJoin('pick.student', 'student')
      .where('pick.studentId = :studentId', { studentId })
      .andWhere('student.schoolId = :schoolId', { schoolId })
      .andWhere('pick.termId = :termId', { termId })
      .andWhere('pick.endedBy IS NULL');

    return await queryBuilder.getMany();
  }

  //? 학생의 수강중인 반 조회 (요일별로 분리)
  async listGroupsWeekly(
    schoolId: number,
    termId: number,
    studentId: number,
  ): Promise<Record<string, Group[]>> {
    const groups = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .leftJoin('pick.student', 'student')
      .where('pick.studentId = :studentId', { studentId })
      .andWhere('student.schoolId = :schoolId', { schoolId })
      .andWhere('pick.termId = :termId', { termId })
      .andWhere('pick.endedBy IS NULL')
      .getMany();

    // 요일별 결과 객체 초기화
    const result: Record<string, Group[]> = {
      SUN: [],
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
    };

    // 각 그룹을 요일별로 분류
    for (const group of groups) {
      if (group.schooldays && group.schooldays.length > 0) {
        // 각 그룹의 schooldays에서 가장 마지막 수업 시간 찾기
        const lastSchoolday = group.schooldays.reduce((latest, current) => {
          return current.startsAt > latest.startsAt ? current : latest;
        });

        // 가장 마지막 수업의 요일 결정
        const dayOfWeek = lastSchoolday.startsAt.getDay();
        const weekdayKey = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][
          dayOfWeek
        ];

        result[weekdayKey].push(group);
      }
    }

    // 각 요일별로 가장 마지막 수업이 제일 마지막에 오도록 정렬
    Object.keys(result).forEach((day) => {
      result[day].sort((a, b) => {
        // 각 그룹의 가장 마지막 수업 시간 비교
        const aLastSchoolday = a.schooldays?.reduce((latest, current) => {
          return current.startsAt > latest.startsAt ? current : latest;
        });
        const bLastSchoolday = b.schooldays?.reduce((latest, current) => {
          return current.startsAt > latest.startsAt ? current : latest;
        });

        if (!aLastSchoolday || !bLastSchoolday) return 0;

        // 가장 마지막 수업이 나중에 끝나는 그룹이 뒤에 오도록 정렬
        return (
          aLastSchoolday.startsAt.getTime() - bLastSchoolday.startsAt.getTime()
        );
      });
    });

    return result;
  }

  //? 학생의 수강중인 반 조회 (페이지네이션)
  async infiniteListGroups(
    schoolId: number,
    termId: number,
    studentId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Group>> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .leftJoin('pick.student', 'student')
      .where('pick.studentId = :studentId', { studentId })
      .andWhere('student.schoolId = :schoolId', { schoolId })
      .andWhere('pick.termId = :termId', { termId })
      .andWhere('pick.endedBy IS NULL');

    const config: PaginateConfig<Group> = {
      sortableColumns: ['id', 'groupName'],
      filterableColumns: {
        groupName: [FilterOperator.ILIKE],
      },
    };

    return paginate(query, queryBuilder, config);
  }

  //? 학생의 수강취소된 반 조회
  async listCanceledGroups(
    schoolId: number,
    termId: number,
    studentId: number,
  ): Promise<Group[]> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .leftJoin('pick.student', 'student')
      .where('pick.studentId = :studentId', { studentId })
      .andWhere('student.schoolId = :schoolId', { schoolId })
      .andWhere('pick.termId = :termId', { termId })
      .andWhere('pick.endedBy IS NOT NULL');

    return await queryBuilder.getMany();
  }

  //? 학생의 수강취소된 반 조회 (페이지네이션)
  async infiniteListCanceledGroups(
    schoolId: number,
    termId: number,
    studentId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Group>> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .leftJoin('pick.student', 'student')
      .where('pick.studentId = :studentId', { studentId })
      .andWhere('student.schoolId = :schoolId', { schoolId })
      .andWhere('pick.termId = :termId', { termId })
      .andWhere('pick.endedBy IS NOT NULL');

    const config: PaginateConfig<Group> = {
      sortableColumns: ['id', 'groupName'],
      filterableColumns: {
        groupName: [FilterOperator.ILIKE],
      },
    };

    return paginate(query, queryBuilder, config);
  }
}
