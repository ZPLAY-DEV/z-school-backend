import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { endOfWeek, startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Group } from 'src/domain/group/entities/group.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Repository } from 'typeorm';
import { ResponseSchoolTermSamOfferingDto } from './dto/response-school-term-sam-offering.dto';
import {
  ResponseGroupSlimDto,
  ResponseSchooldayItemDto,
  ResponseWeeklySchooldayDto,
} from './dto/response-student-schoolday.dto';

@Injectable()
export class SchoolTermSamService {
  private readonly logger = new Logger(SchoolTermSamService.name);

  constructor(
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  //? 담임쌤의 수강중인 반 조회
  // async listGroups(
  //   schoolId: number,
  //   termId: number,
  //   samId: number,
  // ): Promise<Group[]> {
  //   const queryBuilder = this.groupRepository
  //     .createQueryBuilder('group')
  //     .leftJoinAndSelect('group.contracts', 'contract')
  //     .leftJoin('contract.sam', 'sam')
  //     .where('contract.samId = :samId', { samId })
  //     .andWhere('sam.schoolId = :schoolId', { schoolId })
  //     .andWhere('contract.termId = :termId', { termId })
  //     .andWhere('contract.endedBy IS NULL');

  //   return await queryBuilder.getMany();
  // }

  async listGroups(
    schoolId: number,
    termId: number,
    samId: number,
  ): Promise<Group[]> {
    const queryBuilder = this.samRepository
      .createQueryBuilder('sam')
      .leftJoinAndSelect('sam.contracts', 'contract')
      .leftJoinAndSelect('contract.group', 'group')
      .leftJoinAndSelect('group.lesson', 'lesson')
      .leftJoinAndSelect('lesson.offerings', 'offerings')
      .where('sam.id = :samId', { samId })
      .andWhere('sam.schoolId = :schoolId', { schoolId })
      .andWhere('contract.termId = :termId', { termId })
      .andWhere('contract.endedBy IS NULL');

    const sam = await queryBuilder.getOne();
    return sam?.contracts.map((contract) => contract.group) || [];
  }

  async listOfferings(
    schoolId: number,
    termId: number,
    samId: number,
  ): Promise<ResponseSchoolTermSamOfferingDto[]> {
    const queryBuilder = this.samRepository
      .createQueryBuilder('sam')
      .leftJoinAndSelect('sam.contracts', 'contract')
      .leftJoinAndSelect('contract.group', 'group')
      .leftJoinAndSelect('group.lesson', 'lesson')
      .leftJoinAndSelect('lesson.offerings', 'offering')
      .where('sam.id = :samId', { samId })
      .andWhere('sam.schoolId = :schoolId', { schoolId })
      .andWhere('contract.termId = :termId', { termId })
      .andWhere('contract.endedBy IS NULL');

    const sam = await queryBuilder.getOne();

    if (!sam) {
      return [];
    }

    // 담임쌤의 contracts에서 unique한 offering들을 수집
    const offeringMap = new Map<number, Offering>();
    sam.contracts?.forEach((contract) => {
      if (contract.group?.lesson?.offerings) {
        contract.group.lesson.offerings.forEach((offering) => {
          const groupId = contract.group.id;
          if (offering.groupIds.includes(groupId)) {
            offeringMap.set(offering.id, offering);
          }
        });
      }
    });

    const uniqueOfferings = Array.from(offeringMap.values());

    // 각 offering에 대해 groupIds에 해당하는 그룹들의 tuition 정보를 가져오기
    const result: ResponseSchoolTermSamOfferingDto[] = [];

    for (const offering of uniqueOfferings) {
      // offering.groupIds에 해당하는 그룹들의 정보 조회
      const groups = await this.groupRepository
        .createQueryBuilder('group')
        .where('group.id IN (:...groupIds)', { groupIds: offering.groupIds })
        .getMany();

      // 그룹 totals 정보 생성
      const totals: number[] = groups.map((group) => {
        return group.tuition + group.bookFee + group.materialFee;
      });

      // ResponseSchoolTermSamOfferingDto 생성
      const offeringDto: ResponseSchoolTermSamOfferingDto = {
        id: offering.id,
        schoolId: offering.schoolId,
        termId: offering.termId,
        lessonId: offering.lessonId,
        schoolName: offering.schoolName,
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
        groupIds: offering.groupIds,
        prepickedStudentIds: offering.prepickedStudentIds,
        lastSyncTimestamp: offering.lastSyncTimestamp,
        status: offering.status,
        createdAt: offering.createdAt,
        updatedAt: offering.updatedAt,
        totals: totals,
      };

      result.push(offeringDto);
    }

    return result;
  }

  async listSchooldays(
    schoolId: number,
    termId: number,
    samId: number,
  ): Promise<ResponseSchooldayItemDto[]> {
    const queryBuilder = this.samRepository
      .createQueryBuilder('sam')
      .leftJoinAndSelect('sam.contracts', 'contract')
      .leftJoinAndSelect('contract.group', 'group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .leftJoinAndSelect('schoolday.group', 'schooldayGroup') // 추가: schoolday의 group 관계 로드
      .where('sam.id = :samId', { samId })
      .andWhere('sam.schoolId = :schoolId', { schoolId })
      .andWhere('contract.termId = :termId', { termId })
      .andWhere('contract.endedBy IS NULL');

    const sam = await queryBuilder.getOne();

    if (!sam) {
      throw new NotFoundException('Sam not found');
    }

    // 담임쌤의 contracts에서 모든 schooldays 추출 (group 관계 포함됨)
    const schooldays: Schoolday[] = [];
    sam.contracts?.forEach((contract) => {
      if (contract.group && contract.group.schooldays) {
        contract.group.schooldays.forEach((schoolday) => {
          schooldays.push(schoolday);
        });
      }
    });

    // 시간순 정렬
    schooldays.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    // DTO 변환
    const items: ResponseSchooldayItemDto[] = schooldays.map((sd) => ({
      id: sd.id,
      schoolId: sd.schoolId,
      termId: sd.termId,
      lessonId: sd.lessonId,
      groupId: sd.groupId,
      name: sd.name,
      startsAt: sd.startsAt?.toISOString() ?? (null as unknown as string),
      endsAt: sd.endsAt?.toISOString() ?? (null as unknown as string),
      duration: sd.duration,
      updatedBy: sd.updatedBy,
      note: sd.note,
      startNotifiedAt: sd.startNotifiedAt
        ? sd.startNotifiedAt.toISOString()
        : null,
      endNotifiedAt: sd.endNotifiedAt ? sd.endNotifiedAt.toISOString() : null,
      group: {
        id: sd.group.id,
        termId: sd.group.termId ?? null,
        samId: sd.group.samId ?? null,
        lessonId: sd.group.lessonId,
        offeringId: sd.group.offeringId ?? null,
        groupName: sd.group.groupName,
        samName: sd.group.samName ?? null,
        location: sd.group.location ?? null,
        capacity: sd.group.capacity,
        allowedGrades: sd.group.allowedGrades,
        weekday: sd.group.weekday,
        start: sd.group.start,
        end: sd.group.end,
        status: sd.group.status,
        tuition: sd.group.tuition,
        bookFee: sd.group.bookFee,
        materialFee: sd.group.materialFee,
        days: sd.group.days,
        deletedBy: sd.group.deletedBy ?? null,
        note: sd.group.note ?? null,
        createdAt: sd.group.createdAt,
        updatedAt: sd.group.updatedAt,
      } as ResponseGroupSlimDto,
    }));

    return items;
  }

  async listWeeklySchooldays(
    schoolId: number,
    termId: number,
    samId: number,
    date?: string,
  ): Promise<ResponseWeeklySchooldayDto> {
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

      // 4. 먼저 담임쌤 존재 여부 확인 (주별 필터링 없이)
      const sam = await this.samRepository
        .createQueryBuilder('sam')
        .leftJoinAndSelect('sam.contracts', 'contract')
        .leftJoinAndSelect('contract.group', 'group')
        .leftJoinAndSelect('group.schooldays', 'schoolday')
        .leftJoinAndSelect('schoolday.group', 'schooldayGroup')
        .where('sam.id = :samId', { samId })
        .andWhere('sam.schoolId = :schoolId', { schoolId })
        .andWhere('contract.termId = :termId', { termId })
        .andWhere('contract.endedBy IS NULL')
        .getOne();

      if (!sam) {
        throw new NotFoundException('Sam not found');
      }

      // 5. 요일별로 그룹화 (DTO)
      const result: ResponseWeeklySchooldayDto = {
        SUN: [],
        MON: [],
        TUE: [],
        WED: [],
        THU: [],
        FRI: [],
        SAT: [],
      };

      // 6. 담임쌤의 contracts에서 해당 주의 schooldays만 추출 및 그룹화
      sam.contracts?.forEach((contract) => {
        if (contract.group && contract.group.schooldays) {
          contract.group.schooldays.forEach((schoolday) => {
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

              const item: ResponseSchooldayItemDto = {
                id: schoolday.id,
                schoolId: schoolday.schoolId,
                termId: schoolday.termId,
                lessonId: schoolday.lessonId,
                groupId: schoolday.groupId,
                name: schoolday.name,
                startsAt:
                  schoolday.startsAt?.toISOString() ??
                  (null as unknown as string),
                endsAt:
                  schoolday.endsAt?.toISOString() ??
                  (null as unknown as string),
                duration: schoolday.duration,
                updatedBy: schoolday.updatedBy,
                note: schoolday.note,
                startNotifiedAt: schoolday.startNotifiedAt
                  ? schoolday.startNotifiedAt.toISOString()
                  : null,
                endNotifiedAt: schoolday.endNotifiedAt
                  ? schoolday.endNotifiedAt.toISOString()
                  : null,
                group: {
                  id: schoolday.group.id,
                  termId: schoolday.group.termId ?? null,
                  samId: schoolday.group.samId ?? null,
                  lessonId: schoolday.group.lessonId,
                  offeringId: schoolday.group.offeringId ?? null,
                  groupName: schoolday.group.groupName,
                  samName: schoolday.group.samName ?? null,
                  location: schoolday.group.location ?? null,
                  capacity: schoolday.group.capacity,
                  allowedGrades: schoolday.group.allowedGrades,
                  weekday: schoolday.group.weekday,
                  start: schoolday.group.start,
                  end: schoolday.group.end,
                  status: schoolday.group.status,
                  tuition: schoolday.group.tuition,
                  bookFee: schoolday.group.bookFee,
                  materialFee: schoolday.group.materialFee,
                  days: schoolday.group.days,
                  deletedBy: schoolday.group.deletedBy ?? null,
                  note: schoolday.group.note ?? null,
                  createdAt: schoolday.group.createdAt,
                  updatedAt: schoolday.group.updatedAt,
                } as ResponseGroupSlimDto,
              };

              result[weekdayKey].push(item);
            }
          });
        }
      });

      // 7. 각 요일별로 시간 순으로 정렬
      (Object.keys(result) as (keyof ResponseWeeklySchooldayDto)[]).forEach(
        (day) => {
          result[day].sort((a, b) => {
            return (
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
            );
          });
        },
      );

      return result;
    } catch (error) {
      this.logger.error('listWeeklySchooldays 오류:', error);
      throw error;
    }
  }
}
