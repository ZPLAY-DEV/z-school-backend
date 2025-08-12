import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { formatInTimeZone } from 'date-fns-tz';
import { WeekdayOrder } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { BulkUpdateSamsDto } from 'src/domain/sam/dto/bulk-update-sams.dto';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { GroupWithPicksCount, Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
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

      let finalInstructorId: number;

      // 2. 강사 처리: instructorId 우선, 없으면 instructor 객체 방식 사용
      if (instructorId) {
        // instructorId가 제공된 경우 - 기존 강사 직접 참조
        const existingInstructor = await manager.findOne(Instructor, {
          where: { id: instructorId },
        });
        if (!existingInstructor) {
          throw new NotFoundException('Instructor not found');
        }
        finalInstructorId = instructorId;
      } else if (instructorDto.id) {
        // instructor.id가 있으면 기존 강사 연결
        const existingInstructor = await manager.findOne(Instructor, {
          where: { id: instructorDto.id },
        });
        if (!existingInstructor) {
          throw new NotFoundException('Instructor not found');
        }
        finalInstructorId = instructorDto.id;
      } else {
        // instructorDto.phone을 사용해서 기존 강사 검사
        if (instructorDto.phone) {
          const existingInstructor = await manager.findOne(Instructor, {
            where: { phone: instructorDto.phone },
          });
          if (existingInstructor) {
            // 기존 강사가 있으면 해당 강사 사용
            finalInstructorId = existingInstructor.id;
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
            finalInstructorId = savedInstructor.id;
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
          finalInstructorId = savedInstructor.id;
        }
      }

      // 3. 중복 체크 - 동일 학교 내 강사 중복
      const existingSam = await manager.findOne(Sam, {
        where: {
          schoolId: dto.schoolId,
          instructorId: finalInstructorId,
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
        instructorId: finalInstructorId,
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
        where: { phone: instructorDto.phone },
      });
      if (existingInstructor) {
        targetInstructorId = existingInstructor.id;
      } else {
        // 새로운 강사가 생성될 예정이므로 중복 체크 불가
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

  async findById(id: number, relations: string[] = []): Promise<Sam> {
    try {
      return relations.length > 0
        ? await this.samRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.samRepository.findOneOrFail({
            where: { id },
          });
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
      const today = formatInTimeZone(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');

      // 한 번의 쿼리로 모든 그룹의 picks 수를 가져옴
      const picksCounts = await this.groupRepository
        .createQueryBuilder('group')
        .leftJoin('group.picks', 'pick')
        .select('group.id', 'groupId')
        .addSelect('COUNT(pick.id)', 'picksCount')
        .where('group.id IN (:...groupIds)', { groupIds })
        .andWhere(
          '(pick.startedBy IS NULL AND pick.endedBy IS NULL) OR ' +
            '(pick.startedBy IS NOT NULL AND pick.endedBy IS NOT NULL AND ' +
            ':today BETWEEN pick.start AND pick.end)',
          { today },
        )
        .groupBy('group.id')
        .getRawMany();

      // picks 수를 그룹에 추가
      const picksCountMap = new Map(
        picksCounts.map((item) => [
          item.groupId,
          parseInt(String(item.picksCount)),
        ]),
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

  //? Sam > Groups 은 term 필터링이 불가능하므로,
  //? Sam > Contracts > Groups 으로 조회하는 방법을 사용한다.
  async getSchooldaysByDate(
    id: number,
    termId?: number,
    date?: string,
  ): Promise<Schoolday[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id },
      relations: [
        'contracts',
        'contracts.group',
        'contracts.group.schooldays',
        'contracts.group.schooldays.departures',
      ],
    });

    // SAM의 모든 contracts의 groups에서 schooldays를 수집
    const allSchooldays: Schoolday[] = [];

    for (const contract of sam.contracts) {
      if (termId && contract.termId !== Number(termId)) {
        continue;
      }

      if (contract.group && contract.group?.schooldays) {
        const schooldaysWithGroup = contract.group.schooldays
          .filter((schoolday) => {
            if (!date) {
              return true;
            }
            return schoolday.today === date;
          })
          .map((schoolday) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { schooldays: _, ...groupWithoutSchooldays } = contract.group;
            return {
              ...schoolday,
              group: groupWithoutSchooldays as any, // 타입 단언으로 순환 참조 방지
            };
          });
        allSchooldays.push(...schooldaysWithGroup);
      }
    }

    return allSchooldays;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async bulkUpdate(dto: BulkUpdateSamsDto): Promise<Sam[]> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const { samIds, ...updateData } = dto;
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
        // 3. Sam 정보 업데이트 (강사 정보는 변경하지 않음)
        const updatedSam = manager.merge(Sam, existingSam, updateData);
        const savedSam = await manager.save(Sam, updatedSam);

        // 4. 업데이트된 Sam 조회 및 배열에 추가
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
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Sam 존재 여부 확인
      const existingSam = await manager.findOne(Sam, {
        where: { id },
        relations: ['instructor'],
      });

      if (!existingSam) {
        throw new NotFoundException(`Sam not found`);
      }

      const { instructor: instructorDto, instructorId, ...samDto } = dto;
      let finalInstructorId = existingSam.instructorId;

      // 2. 강사 정보 처리
      if (instructorId) {
        // instructorId가 제공된 경우 - 기존 강사 직접 참조로 변경
        const existingInstructor = await manager.findOne(Instructor, {
          where: { id: instructorId },
        });
        if (!existingInstructor) {
          throw new NotFoundException('Instructor not found');
        }
        finalInstructorId = instructorId;
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
              name: instructorDto.name,
              phone: instructorDto.phone,
              note: instructorDto.note,
              termsAgreedAt: instructorDto.termsAgreedAt,
            },
          );
          await manager.save(Instructor, updatedInstructor);
          finalInstructorId = instructorDto.id;
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
                name: instructorDto.name,
                phone: instructorDto.phone,
                note: instructorDto.note,
                termsAgreedAt: instructorDto.termsAgreedAt,
              },
            );
            await manager.save(Instructor, updatedInstructor);
            finalInstructorId = existingSam.instructorId;
          } else {
            // 현재 연결된 강사가 없으면 새로운 강사 생성
            const newInstructor = manager.create(Instructor, {
              name: instructorDto.name,
              phone: instructorDto.phone,
              note: instructorDto.note,
              termsAgreedAt: instructorDto.termsAgreedAt,
            });
            const savedInstructor = await manager.save(
              Instructor,
              newInstructor,
            );
            finalInstructorId = savedInstructor.id;
          }
        }
      }

      // 3. Sam 정보 업데이트
      const updatedSam = manager.merge(Sam, existingSam, {
        ...samDto,
        instructorId: finalInstructorId,
      });
      const savedSam = await manager.save(Sam, updatedSam);

      // 4. 업데이트된 Sam 조회 및 반환
      return await manager.findOneOrFail(Sam, {
        where: { id: savedSam.id },
        relations: ['instructor'],
      });
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async softDelete(id: number, note: string | undefined): Promise<void> {
    if (note) {
      await this.samRepository.update({ id }, { note, deletedAt: new Date() });
    } else {
      const sam = await this.findById(id);
      await this.samRepository.softRemove(sam);
    }
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
