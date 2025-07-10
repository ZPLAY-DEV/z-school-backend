import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { getEnglishWeekday } from 'src/helpers/date';
import { Repository } from 'typeorm';

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
  ): Promise<Booking[]> {
    return await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.studentId = :studentId', { studentId })
      .andWhere('offering.schoolId = :schoolId', { schoolId })
      .andWhere('offering.termId = :termId', { termId })
      .getMany();
  }

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
      .where('student.id = :studentId', { studentId })
      .andWhere('student.schoolId = :schoolId', { schoolId })
      .andWhere('pick.termId = :termId', { termId })
      .andWhere('pick.endedBy IS NULL');

    const student = await queryBuilder.getOne();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 학생의 picks에서 모든 schooldays 추출
    const schooldays: Schoolday[] = [];
    student.picks?.forEach((pick) => {
      if (pick.group && pick.group.schooldays) {
        schooldays.push(...pick.group.schooldays);
      }
    });

    // 중복 제거 (같은 schoolday가 여러 group에 있을 수 있다면...)
    // const uniqueSchooldays = schooldays.filter(
    //   (schoolday, index, self) =>
    //     index === self.findIndex((s) => s.id === schoolday.id),
    // );

    return schooldays;
  }

  //? 학생의 수강중인 반 조회
  async listGroups(
    schoolId: number,
    termId: number,
    studentId: number,
  ): Promise<Group[]> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .where('student.id = :studentId', { studentId })
      .andWhere('student.schoolId = :schoolId', { schoolId })
      .andWhere('pick.termId = :termId', { termId })
      .andWhere('pick.endedBy IS NULL');

    return await queryBuilder.getMany();
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
