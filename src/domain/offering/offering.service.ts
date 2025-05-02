import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { EnrollmentRule, Weekday } from 'src/common/enums';
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { getBitmasks } from 'src/helpers/parse';
import { S3Service } from 'src/services/aws/s3.service';
import { Repository } from 'typeorm';

@Injectable()
export class OfferingService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    private readonly s3Service: S3Service,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  //! 5분간격 bitmasks 로직으로 변경
  async create(dto: CreateOfferingDto): Promise<Offering> {
    const item = this.offeringRepository.create(dto);
    return await this.offeringRepository.save(item);
  }

  async seed(): Promise<Offering[]> {
    const items: Offering[] = [
      new Offering({
        schoolName: '삼척초',
        lessonName: '바이올린',
        groupName: '화요일A반 (1~2학년)',
        capacity: 10,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [1, 2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '바이올린',
        groupName: '화요일B반 (3~6학년)',
        capacity: 10,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [3, 4, 5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '교육보드게임',
        groupName: '목요일A반 (2학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.THURSDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '교육보드게임',
        groupName: '목요일B반 (1학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.THURSDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '교육보드게임',
        groupName: '목요일C반 (3~6학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.THURSDAY,
            start: '15:30',
            end: '16:10',
          },
        ],
        allowedGrades: [3, 4, 5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '창의독서',
        groupName: '월요일A반 (1학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '창의독서',
        groupName: '월요일B반 (2학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '창의독서',
        groupName: '금요일A반 (1학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.FRIDAY,
            start: '13:00',
            end: '13:40',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '창의독서',
        groupName: '금요일B반 (2학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.FRIDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '창의독서',
        groupName: '금요일C반 (3-6학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.FRIDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [3, 4, 5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '중국어',
        groupName: '금요일A반 (1학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.FRIDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [145, 146, 147],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '중국어',
        groupName: '금요일B반 (2학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.FRIDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [145, 146, 147],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '중국어',
        groupName: '금요일C반 (3~6학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.FRIDAY,
            start: '15:30',
            end: '16:10',
          },
        ],
        allowedGrades: [3, 4, 5, 6],
        formerStudentIds: [145, 146, 147],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '주산과 암산',
        groupName: '화목A반 (1학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '13:50',
            end: '14:30',
          },
          {
            weekday: Weekday.THURSDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [145, 146, 147],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '주산과 암산',
        groupName: '화목B반 (2학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '14:40',
            end: '15:20',
          },
          {
            weekday: Weekday.THURSDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [1, 2],
        formerStudentIds: [145, 146, 147],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '주산과 암산',
        groupName: '화목C반 (3~6학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '15:30',
            end: '16:10',
          },
          {
            weekday: Weekday.THURSDAY,
            start: '15:30',
            end: '16:10',
          },
        ],
        allowedGrades: [3, 4, 5, 6],
        formerStudentIds: [145, 146, 147],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '로봇과학',
        groupName: '수요일A반 (1~2학년)',
        capacity: 18,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '13:00',
            end: '14:20',
          },
        ],
        allowedGrades: [1, 2],
        formerStudentIds: [145, 146, 147],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '로봇과학',
        groupName: '수요일B반 (3~6학년)',
        capacity: 18,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '14:30',
            end: '15:50',
          },
        ],
        allowedGrades: [1, 2],
        formerStudentIds: [145, 146, 147],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '클레이&아트',
        groupName: '수요일A반 (1학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '13:00',
            end: '13:40',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '클레이&아트',
        groupName: '수요일B반 (2학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '클레이&아트',
        groupName: '수요일C반 (3~6학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [3, 4, 5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '클레이&아트',
        groupName: '금요일D반 (1학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.FRIDAY,
            start: '13:00',
            end: '13:40',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '클레이&아트',
        groupName: '금요일E반 (2학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.FRIDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '놀이체육',
        groupName: '월요일A반 (1학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '놀이체육',
        groupName: '월요일B반 (2학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '놀이체육',
        groupName: '화요일C반 (1학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '놀이체육',
        groupName: '화요일D반 (2학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '놀이체육',
        groupName: '수요일E반 (2학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '놀이체육',
        groupName: '수요일F반 (1학년)',
        capacity: 16,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '미술',
        groupName: '월요일A반 (1~2학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '13:50',
            end: '14:50',
          },
        ],
        allowedGrades: [1, 2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '미술',
        groupName: '월요일B반 (3~6학년)',
        capacity: 20,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '15:00',
            end: '16:00',
          },
        ],
        allowedGrades: [1, 2],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '배드민턴&스포츠',
        groupName: '월요일A반 (3~4학년)',
        capacity: 15,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [3, 4],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '배드민턴&스포츠',
        groupName: '월요일B반 (5~6학년)',
        capacity: 15,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '15:30',
            end: '16:10',
          },
        ],
        allowedGrades: [5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '배드민턴&스포츠',
        groupName: '수요일A반 (3~4학년)',
        capacity: 15,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '13:50',
            end: '14:30',
          },
        ],
        allowedGrades: [3, 4],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '배드민턴&스포츠',
        groupName: '수요일B반 (5~6학년)',
        capacity: 15,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '축구',
        groupName: '월요일A반 (3~6학년)',
        capacity: 30,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '14:40',
            end: '16:00',
          },
        ],
        allowedGrades: [3, 4, 5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '축구',
        groupName: '수요일A반 (3~6학년)',
        capacity: 30,
        times: [
          {
            weekday: Weekday.WEDNESDAY,
            start: '14:40',
            end: '16:00',
          },
        ],
        allowedGrades: [3, 4, 5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '컴퓨터',
        groupName: '월화수목금요일반 (1~6학년)',
        capacity: 50,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '13:00',
            end: '16:20',
          },
          {
            weekday: Weekday.TUESDAY,
            start: '13:00',
            end: '16:20',
          },
          {
            weekday: Weekday.WEDNESDAY,
            start: '13:00',
            end: '16:20',
          },
          {
            weekday: Weekday.THURSDAY,
            start: '13:00',
            end: '16:20',
          },
          {
            weekday: Weekday.FRIDAY,
            start: '13:00',
            end: '16:20',
          },
        ],
        allowedGrades: [1, 2, 3, 4, 5, 6],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '축구1',
        groupName: '맞춤화요일반 (1학년)',
        capacity: 30,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      new Offering({
        schoolName: '삼척초',
        lessonName: '음악줄넘기1',
        groupName: '맞춤화요일반 (1학년)',
        capacity: 30,
        times: [
          {
            weekday: Weekday.TUESDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.FIRST,
        allowTimeOverlap: false,
      }),
      /* -------------------------------------------------- */
      new Offering({
        schoolName: '삼척초',
        lessonName: '창의교실A',
        groupName: '맞춤형(1학년)',
        capacity: 1000,
        times: [
          {
            weekday: Weekday.MONDAY,
            start: '14:40',
            end: '15:20',
          },
          {
            weekday: Weekday.TUESDAY,
            start: '14:40',
            end: '15:20',
          },
          {
            weekday: Weekday.WEDNESDAY,
            start: '14:40',
            end: '15:20',
          },
          {
            weekday: Weekday.THURSDAY,
            start: '14:40',
            end: '15:20',
          },
          {
            weekday: Weekday.FRIDAY,
            start: '14:40',
            end: '15:20',
          },
        ],
        allowedGrades: [1],
        formerStudentIds: [],
        enrollmentRule: EnrollmentRule.ANYONE,
        allowTimeOverlap: false,
      }),
    ];
    for (const item of items) {
      const bitmasks: number[] = [];

      for (const time of item.times) {
        const slots = getBitmasks(time);
        bitmasks.push(...slots);
      }

      // slots 를 중복 없이 정리하고 정렬해서 저장
      item.bitmasks = Array.from(new Set(bitmasks)).sort((a, b) => a - b);
    }

    return await this.offeringRepository.save(items);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  async findAll(query: PaginateQuery): Promise<Paginated<Offering>> {
    const queryBuilder = this.offeringRepository.createQueryBuilder('offering');
    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'schoolName', 'lessonName', 'groupName'],
      searchableColumns: ['schoolName', 'lessonName', 'groupName'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        isActive: [FilterOperator.EQ],
        offeringType: [FilterOperator.EQ],
      },
    });
  }

  async list(): Promise<Offering[]> {
    return await this.offeringRepository
      .createQueryBuilder('offering')
      .orderBy('offering.id', 'DESC')
      .getMany();
  }

  async findBySchoolId(schoolId: number): Promise<Offering[]> {
    return await this.offeringRepository
      .createQueryBuilder('offering')
      .orderBy('offering.id', 'DESC')
      .where({ schoolId })
      .getMany();
  }

  async findById(id: number, relations: string[] = []): Promise<Offering> {
    try {
      return relations.length > 0
        ? await this.offeringRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.offeringRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException('entity not found');
    }
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  async update(id: number, dto: UpdateOfferingDto): Promise<Offering> {
    const offering = await this.offeringRepository.preload({ id, ...dto });
    if (!offering) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.offeringRepository.save(offering);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  // note that this is hard-delete
  async remove(id: number): Promise<Offering> {
    const offering = await this.findById(id);
    return await this.offeringRepository.remove(offering);
  }
}
