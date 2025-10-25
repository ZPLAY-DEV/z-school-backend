import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WeekdayOrder } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { BulkUpdateSamsDto } from 'src/domain/sam/dto/bulk-update-sams.dto';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { GroupWithPicksCount, Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { getKoreanWeekday } from 'src/helpers/date';
import { normalizePhone } from 'src/helpers/phone';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

@Injectable()
export class SamService {
  private readonly logger = new Logger(SamService.name);

  constructor(
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //! somehow we prefer to use upsert instead of create
  async create(dto: CreateSamDto): Promise<Sam> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const { instructor: instructorDto, instructorId, ...samDto } = dto;

      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: dto.schoolId },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      let thisInstructorId: number;

      // 2. 강사 처리: instructorId 우선, 없으면 instructor 객체 방식 사용
      if (instructorId) {
        // instructorId가 제공된 경우 - 기존 강사 직접 참조
        const existingInstructor = await manager.findOne(Instructor, {
          where: { id: instructorId },
        });
        if (!existingInstructor) {
          throw new NotFoundException('Instructor not found');
        }
        thisInstructorId = instructorId;
      } else if (instructorDto.id) {
        // instructor.id가 있으면 기존 강사 연결
        const existingInstructor = await manager.findOne(Instructor, {
          where: { id: instructorDto.id },
        });
        if (!existingInstructor) {
          throw new NotFoundException('Instructor not found');
        }
        thisInstructorId = instructorDto.id;
      } else {
        // instructorDto.phone을 사용해서 기존 강사 검사
        if (instructorDto.phone) {
          const existingInstructor = await manager.findOne(Instructor, {
            where: { phone: normalizePhone(instructorDto.phone) },
          });
          if (existingInstructor) {
            // 기존 강사가 있으면 해당 강사 사용
            thisInstructorId = existingInstructor.id;
          } else {
            // 기존 강사가 없으면 새로 생성
            const newInstructor = manager.create(Instructor, {
              userId: instructorDto.userId,
              name: instructorDto.name,
              phone: instructorDto.phone,
              note: instructorDto.note,
              termsAgreedAt: instructorDto.termsAgreedAt,
            });
            const savedInstructor = await manager.save(
              Instructor,
              newInstructor,
            );
            thisInstructorId = savedInstructor.id;
          }
        } else {
          // phone이 없는 경우 새로 생성
          const newInstructor = manager.create(Instructor, {
            userId: instructorDto.userId,
            name: instructorDto.name,
            phone: instructorDto.phone,
            note: instructorDto.note,
            termsAgreedAt: instructorDto.termsAgreedAt,
          });
          const savedInstructor = await manager.save(Instructor, newInstructor);
          thisInstructorId = savedInstructor.id;
        }
      }

      // 3. 중복 체크 - 동일 학교 내 강사 중복
      const existingSam = await manager.findOne(Sam, {
        where: {
          schoolId: dto.schoolId,
          instructorId: thisInstructorId,
        },
      });

      if (existingSam) {
        throw new ConflictException(
          'This instructor is already registered in this school',
        );
      }

      // 4. Sam 생성
      const sam = manager.create(Sam, {
        ...samDto,
        instructorId: thisInstructorId,
        score: dto.score ?? 0,
        editFeePermission: dto.editFeePermission ?? false,
        editPickPermission: dto.editPickPermission ?? false,
      });

      const savedSam = await manager.save(Sam, sam);

      // 5. 관계 정보와 함께 반환
      return await manager.findOneOrFail(Sam, {
        where: { id: savedSam.id },
        relations: ['instructor'],
      });
    });
  }

  async dryRun(dto: CreateSamDto): Promise<Sam | null> {
    const { instructor: instructorDto, instructorId } = dto;

    let targetInstructorId: number | null = null;

    // 1. 강사 처리: instructorId 우선, 없으면 instructor 객체 방식 사용
    if (instructorId) {
      // instructorId가 제공된 경우 - 기존 강사 직접 참조
      const existingInstructor = await this.instructorRepository.findOne({
        where: { id: instructorId },
      });
      if (!existingInstructor) {
        throw new NotFoundException('Instructor not found');
      }
      targetInstructorId = instructorId;
    } else if (instructorDto.id) {
      // instructor.id가 있으면 기존 강사 연결
      const existingInstructor = await this.instructorRepository.findOne({
        where: { id: instructorDto.id },
      });
      if (!existingInstructor) {
        throw new NotFoundException('Instructor not found');
      }
      targetInstructorId = instructorDto.id;
    } else if (instructorDto.phone) {
      // 새로운 강사 생성 방식 - 전화번호로 기존 강사 확인
      const existingInstructor = await this.instructorRepository.findOne({
        where: { phone: normalizePhone(instructorDto.phone) },
      });
      if (existingInstructor) {
        targetInstructorId = existingInstructor.id;
      } else {
        // 새로운 강사가 생성될 예정이므로 중복 체크 불필요
        return null;
      }
    }

    // 2. 중복 체크 - 동일 학교 내 강사 중복
    if (targetInstructorId) {
      const existingSam = await this.samRepository.findOne({
        where: {
          schoolId: dto.schoolId,
          instructorId: targetInstructorId,
        },
        relations: ['instructor'],
      });

      return existingSam || null;
    }

    return null;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findById(
    id: number,
    relations: string[] = [],
    termId?: number,
  ): Promise<Sam> {
    try {
      const sam =
        relations.length > 0
          ? await this.samRepository.findOneOrFail({
              where: { id },
              relations,
            })
          : await this.samRepository.findOneOrFail({
              where: { id },
            });

      // termId가 제공된 경우 contracts를 필터링
      if (termId && sam.contracts) {
        sam.contracts = sam.contracts.filter(
          (contract) => contract.termId === Number(termId),
        );
      }

      return sam;
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException('Sam not found');
    }
  }

  //? Sam > Groups 은 term 필터링이 불가능하므로,
  //? Sam > Contracts > Groups 으로 조회하는 방법을 사용한다.
  async getGroupsById(
    id: number,
    termId?: number,
    sortBy?: string,
  ): Promise<GroupWithPicksCount[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id },
      relations: ['contracts', 'contracts.group', 'contracts.group.lesson'],
    });

    if (termId) {
      sam.contracts = sam.contracts.filter(
        (contract) => contract.termId === Number(termId),
      );
    }

    let groups: GroupWithPicksCount[] = (sam?.contracts.map(
      (contract) => contract.group,
    ) ?? []) as unknown as GroupWithPicksCount[];

    // 각 그룹의 picks 수를 효율적으로 계산
    if (groups.length > 0) {
      const groupIds = groups.map((group) => group.id);

      // 한 번의 쿼리로 해당 그룹의 모든 active picks 수를 가져옴.
      const picksCounts = await this.groupRepository
        .createQueryBuilder('group')
        .leftJoin('group.picks', 'pick')
        .select('group.id', 'groupId')
        .addSelect('COUNT(pick.id)', 'picksCount')
        .where('group.id IN (:...groupIds)', { groupIds })
        .andWhere('pick.isActive = :isActive', { isActive: true })
        .groupBy('group.id')
        .getRawMany();

      // picks 수를 그룹에 추가
      const picksCountMap = new Map(
        picksCounts.map((item) => [item.groupId, Number(item.picksCount)]),
      );

      groups = groups.map((group) => ({
        ...group,
        picksCount: picksCountMap.get(group.id) || 0,
      })) as unknown as GroupWithPicksCount[];
    }

    // 정렬 로직 추가
    if (sortBy) {
      groups = this._sortGroups(groups, sortBy);
    }

    return groups as unknown as GroupWithPicksCount[];
  }

  //? SAM과 직접 관련된 그룹들의 schooldays만 조회 (SQL 레벨 최적화)
  async getAllSchooldays(
    id: number,
    termId: number,
    monthStr?: string, //! in YYYY-MM format
  ): Promise<Schoolday[]> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(Schoolday, 'schoolday')
      .leftJoin('schoolday.group', 'group')
      .leftJoinAndSelect('schoolday.departures', 'departures')
      .where('group.samId = :samId', { samId: id })
      .andWhere('schoolday.termId = :termId', { termId });

    if (monthStr) {
      // "2025-08" 형태의 문자열을 파싱하여 해당 월의 시작일과 마지막일 계산
      const [year, month] = monthStr.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1); // 월은 0부터 시작하므로 -1
      const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 다음 달의 0일 = 이번 달의 마지막일
      // startsAt이 기간 안에 있는 경우를 처리 (datetime 비교로 효율성 향상)
      queryBuilder.andWhere(
        'schoolday.startsAt >= :startDate AND schoolday.startsAt <= :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    //! monthStr 관계없이 모두 동일한 날짜 조건으로 조회후 필터링
    queryBuilder.orWhere(
      '(schoolday.original IS NOT NULL AND group.samId = :samId)',
      { samId: id },
    );

    const schooldays = await queryBuilder
      .orderBy('schoolday.weekNumber', 'ASC')
      .getMany();

    // original이 null이 아닌 아이템들에 대해 중복 아이템 생성
    let result: Schoolday[] = [];

    for (const schoolday of schooldays) {
      result.push(schoolday);
      // original이 null이 아닌 경우 중복 아이템 생성 (id만 0으로 설정)
      if (schoolday.original !== null) {
        const duplicate = { ...schoolday };
        duplicate.id = 0;
        duplicate.today = schoolday.original;
        duplicate.original = schoolday.today;
        duplicate.weekday = getKoreanWeekday(schoolday.original);
        duplicate.note = 'red';
        result.push(duplicate);
      }
    }

    // monthStr이 있을 때 today 속성으로 월별 필터링
    if (monthStr) {
      const [, targetMonth] = monthStr.split('-').map(Number);
      result = result.filter((schoolday) => {
        const [, schooldayMonth] = schoolday.today.split('-').map(Number);
        return schooldayMonth === targetMonth;
      });
    }
    // weekday 순차적으로 정렬
    result.sort((a, b) => Number(a.today) - Number(b.today));

    return result;
  }

  //? SAM과 직접 관련된 그룹들의 schooldays만 조회 (SQL 레벨 최적화)
  async getSchooldaysByDate(
    id: number,
    termId: number,
    date: string, //! YYYY-MM-DD
  ): Promise<Schoolday[]> {
    // Sam 존재 여부 확인
    await this.samRepository.findOneOrFail({
      where: { id },
    });

    const queryBuilder = this.dataSource
      .createQueryBuilder(Schoolday, 'schoolday')
      .leftJoinAndSelect('schoolday.group', 'group')
      .leftJoinAndSelect('schoolday.departures', 'departures')
      .where('group.samId = :samId', { samId: id })
      .andWhere('schoolday.termId = :termId', { termId })
      .andWhere('(schoolday.today = :date OR schoolday.original = :date)', {
        date,
      });
    const schooldays = await queryBuilder.getMany();
    const result: Schoolday[] = [];

    for (const schoolday of schooldays) {
      result.push(schoolday);
      if (schoolday.original !== null && schoolday.original === date) {
        const duplicate = { ...schoolday };
        duplicate.id = 0;
        duplicate.today = schoolday.original;
        duplicate.original = schoolday.today;
        duplicate.weekday = getKoreanWeekday(schoolday.original);
        duplicate.note = 'red';
        result.push(duplicate);
      }
    }

    return result.filter((schoolday) => schoolday.today === date);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async bulkUpdate(dto: BulkUpdateSamsDto, termId?: number): Promise<Sam[]> {
    let samIds: number[] = [];
    if (termId) {
      // termId에 해당하는 모든 samId를 쿼리 빌더로 조회
      const rows =
        (await this.dataSource
          .createQueryBuilder(Sam, 'sam')
          .distinct()
          .select('sam.id')
          .leftJoin('sam.contracts', 'contract')
          .where('contract.termId = :termId', { termId })
          .getMany()) || [];

      samIds = rows.map((row) => row.id);
    } else {
      samIds = dto.samIds || [];
    }
    if (samIds.length === 0) {
      throw new NotFoundException(
        `이번 학기 강좌에 배정된 강사가 없습니다. 강좌 등록 후 다시 시도하세요.`,
      );
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const updatedSams: Sam[] = [];

      // 1. 모든 Sam 존재 여부 확인
      const existingSams = await manager.find(Sam, {
        where: { id: In(samIds) },
        relations: ['instructor'],
      });

      if (existingSams.length !== samIds.length) {
        const foundIds = existingSams.map((sam) => sam.id);
        const missingIds = samIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(`Sams not found: ${missingIds.join(', ')}`);
      }

      // 2. 각 Sam에 대해 업데이트 수행
      for (const existingSam of existingSams) {
        // Sam 정보 업데이트 (강사 정보는 변경하지 않음)
        const updatedSam = manager.merge(Sam, existingSam, dto);
        const savedSam = await manager.save(Sam, updatedSam);

        // 업데이트된 Sam 조회 및 배열에 추가
        const finalSam = await manager.findOneOrFail(Sam, {
          where: { id: savedSam.id },
          relations: ['instructor'],
        });
        updatedSams.push(finalSam);
      }

      return updatedSams;
    });
  }

  async update(id: number, dto: UpdateSamDto): Promise<Sam> {
    try {
      return await this.dataSource.transaction(
        async (manager: EntityManager) => {
          // 1. Sam 존재 여부 확인
          const existingSam = await manager.findOne(Sam, {
            where: { id },
            relations: ['instructor'],
          });

          if (!existingSam) {
            throw new NotFoundException(`Sam not found`);
          }

          const { instructor: instructorDto, instructorId, ...samDto } = dto;
          let thisInstructorId = existingSam.instructorId;

          // 2. 강사 정보 처리
          if (instructorId) {
            // instructorId가 제공된 경우 - 기존 강사 직접 참조로 변경
            const existingInstructor = await manager.findOne(Instructor, {
              where: { id: instructorId },
            });
            if (!existingInstructor) {
              throw new NotFoundException('Instructor not found');
            }
            thisInstructorId = instructorId;
          } else if (instructorDto) {
            if (instructorDto.id) {
              // instructor.id가 있으면 해당 강사 정보 업데이트
              const existingInstructor = await manager.findOne(Instructor, {
                where: { id: instructorDto.id },
              });
              if (!existingInstructor) {
                throw new NotFoundException('Instructor not found');
              }

              // 기존 강사 정보 업데이트
              const updatedInstructor = manager.merge(
                Instructor,
                existingInstructor,
                {
                  userId: instructorDto.userId,
                  name: instructorDto.name,
                  phone: instructorDto.phone,
                  note: instructorDto.note,
                  termsAgreedAt: instructorDto.termsAgreedAt,
                },
              );
              await manager.save(Instructor, updatedInstructor);
              thisInstructorId = instructorDto.id;
            } else {
              // instructor.id가 없으면 현재 연결된 강사의 정보를 업데이트
              if (existingSam.instructorId) {
                const currentInstructor = await manager.findOne(Instructor, {
                  where: { id: existingSam.instructorId },
                });
                if (!currentInstructor) {
                  throw new NotFoundException('Current instructor not found');
                }

                // 현재 강사 정보 업데이트
                const updatedInstructor = manager.merge(
                  Instructor,
                  currentInstructor,
                  {
                    userId: instructorDto.userId,
                    name: instructorDto.name,
                    phone: instructorDto.phone,
                    note: instructorDto.note,
                    termsAgreedAt: instructorDto.termsAgreedAt,
                  },
                );
                await manager.save(Instructor, updatedInstructor);
                thisInstructorId = existingSam.instructorId;
              } else {
                // 현재 연결된 강사가 없으면 새로운 강사 생성
                const newInstructor = manager.create(Instructor, {
                  userId: instructorDto.userId,
                  name: instructorDto.name,
                  phone: instructorDto.phone,
                  note: instructorDto.note,
                  termsAgreedAt: instructorDto.termsAgreedAt,
                });
                const savedInstructor = await manager.save(
                  Instructor,
                  newInstructor,
                );
                thisInstructorId = savedInstructor.id;
              }
            }
          }

          // 3. Sam 정보 업데이트
          const updatedSam = manager.merge(Sam, existingSam, {
            ...samDto,
            instructorId: thisInstructorId,
          });
          const savedSam = await manager.save(Sam, updatedSam);

          // 4. 업데이트된 Sam 조회 및 반환
          const result = await manager.findOneOrFail(Sam, {
            where: { id: savedSam.id },
            relations: ['instructor'],
          });
          return result;
        },
      );
    } catch (error) {
      this.logger.error(`Sam update failed for ID ${id}:`, {
        error: error.message,
        stack: error.stack,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        dto: dto,
      });

      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          '같은 번호를 사용하는 강사가 이미 등록되어 있습니다.',
        );
      }

      throw new InternalServerErrorException(
        '강사 정보 업데이트 중 오류가 발생했습니다.',
      );
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async delete(id: number, note?: string): Promise<void> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const sam = await manager.findOne(Sam, {
        where: { id },
        relations: ['groups', 'instructor'],
      });

      if (!sam) {
        throw new NotFoundException('Sam not found');
      }

      if (sam.groups && sam.groups.length > 0) {
        throw new BadRequestException(
          '담당했던 반이 있는 경우, 삭제할 수 없습니다.',
        );
      }

      const instructorId = sam.instructorId;

      if (note) {
        await manager.update(Sam, { id }, { note, deletedAt: new Date() });
      } else {
        // 해당 강사의 Sam 개수를 먼저 확인 (Sam 삭제 전)
        const allSamsForInstructor = await manager.find(Sam, {
          where: { instructorId },
          select: ['id'],
        });

        // 해당 강사의 Sam이 정확히 1개이고, 그것이 지금 삭제하는 Sam인 경우 강사도 함께 삭제할 예정인지 확인
        const shouldDeleteInstructor =
          allSamsForInstructor.length === 1 &&
          allSamsForInstructor[0].id === id;

        // Sam 삭제
        await manager.remove(sam);

        // 해당 강사의 Sam이 1개뿐이었고 그것이 방금 삭제한 Sam인 경우 강사도 삭제
        if (shouldDeleteInstructor) {
          const instructor = await manager.findOne(Instructor, {
            where: { id: instructorId },
          });
          if (instructor) {
            await manager.remove(instructor);
          }
        }
      }
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Methods
  //? ---------------------------------------------------------------------- ?//

  /**
   * 그룹 목록을 정렬하는 private 메서드
   * @param groups 정렬할 그룹 배열
   * @param sortBy 정렬 기준 ('weekday' | 'name')
   * @returns 정렬된 그룹 배열
   */
  private _sortGroups(
    groups: GroupWithPicksCount[],
    sortBy: string,
  ): GroupWithPicksCount[] {
    const sortedGroups = [...groups];

    switch (sortBy.toLowerCase()) {
      case 'weekday':
        return sortedGroups.sort((a, b) => {
          const orderA = WeekdayOrder[a.weekday] ?? 666;
          const orderB = WeekdayOrder[b.weekday] ?? 666;
          return orderA - orderB;
        });

      case 'name':
        return sortedGroups.sort((a, b) => {
          return a.groupName.localeCompare(b.groupName, 'ko');
        });

      default:
        this.logger.warn(`Unknown sortBy parameter: ${sortBy}`);
        return sortedGroups;
    }
  }
}
