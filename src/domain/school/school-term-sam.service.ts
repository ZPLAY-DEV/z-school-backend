import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { endOfWeek, startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Group } from 'src/domain/group/entities/group.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Repository } from 'typeorm';

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

  async listOfferings(
    schoolId: number,
    termId: number,
    samId: number,
  ): Promise<{ group: Group; offering: Offering }[]> {
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
    return (
      sam?.contracts.map((contract) => {
        const groupId = contract.group.id;
        const offering = contract.group.lesson.offerings.find((offering) =>
          offering.groupIds.includes(groupId),
        )!;

        // offerings 속성을 제외한 lesson 객체 생성
        const { _, ...lessonWithoutOfferings } = contract.group.lesson;
        const cleanGroup = {
          ...contract.group,
          lesson: lessonWithoutOfferings,
        } as Group;

        return {
          group: cleanGroup,
          offering: offering,
        };
      }) || []
    );
  }

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

    return schooldays;
  }

  async listWeeklySchooldays(
    schoolId: number,
    termId: number,
    samId: number,
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

  //? 담임쌤의 수강중인 반 조회
  async listGroups(
    schoolId: number,
    termId: number,
    samId: number,
  ): Promise<Group[]> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.contracts', 'contract')
      .leftJoin('contract.sam', 'sam')
      .where('contract.samId = :samId', { samId })
      .andWhere('sam.schoolId = :schoolId', { schoolId })
      .andWhere('contract.termId = :termId', { termId })
      .andWhere('contract.endedBy IS NULL');

    return await queryBuilder.getMany();
  }
}
