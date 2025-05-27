import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Group } from 'src/domain/group/entities/group.entity';
import { DeleteInstructorNoteDto } from 'src/domain/instructor/dto/delete-instructor-note.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { School } from 'src/domain/school/entities/school.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Sam } from './entities/sam.entity';
import { Document } from '../document/entities/document.entity';
import { getKoreanWeekday } from 'src/helpers/date';
import { transformScheduleResponse } from 'src/helpers/group-schedule.util';
import { Schoolday } from '../schoolday/entities/schoolday.entity';
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
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//
  async create(dto: CreateSamDto): Promise<Sam> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: dto.schoolId },
      });

      if (!school) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
      }

      // 2. instructor 존재 여부 확인
      let instructor: Instructor | undefined;

      if (dto?.instructor) {
        const foundInstructor = await this.instructorRepository.findOne({
          where: { phone: dto.instructor.phone },
        });

        if (foundInstructor) {
          instructor = foundInstructor;
          dto.instructorId = instructor.id;
        } else {
          instructor = this.instructorRepository.create(dto.instructor);
          await this.instructorRepository.save(instructor);
          dto.instructorId = instructor.id;
        }
      }

      if (!instructor) {
        // 업데이트된 강사 정보 조회
        instructor = await manager.findOneOrFail(Instructor, {
          where: { id: dto.instructorId },
        });
      }

      // 4. Sam 관계 upsert (동일 phone 기준)
      let sam = await manager
        .createQueryBuilder(Sam, 'sam')
        .innerJoin('sam.instructor', 'instructor')
        .where('sam.schoolId = :schoolId', {
          schoolId: dto.schoolId,
        })
        .andWhere('sam.instructorId = :instructorId', {
          instructorId: dto.instructorId,
        })
        .getOne();

      if (sam) {
        // 기존 관계 업데이트
        await manager.update(
          Sam,
          { id: sam.id },
          {
            instructorId: instructor.id,
            alias: dto.alias,
            score: dto.score,
            editFeePermission: dto.editFeePermission,
            editEnrollmentPermission: dto.editEnrollmentPermission,
            note: dto.note,
          },
        );
      } else {
        // 새 관계 생성
        sam = manager.create(Sam, {
          instructorId: instructor.id,
          schoolId: dto.schoolId,
          score: dto.score,
          alias: dto.alias,
          editFeePermission: dto.editFeePermission,
          editEnrollmentPermission: dto.editEnrollmentPermission,
          note: dto.note,
        });
        await manager.save(Sam, sam);
      }

      return await manager.findOneOrFail(Sam, {
        where: {
          id: sam.id,
        },
        relations: ['instructor'],
      });
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async dryRun(dto: CreateSamDto): Promise<Sam | null> {
    // In dryRun mode, we check if the instructor exists but don't create it
    const existingSam = await this.samRepository
      .createQueryBuilder('sam')
      .innerJoin(Instructor, 'instructor', 'instructor.id = sam.instructorId')
      .where('sam.schoolId = :schoolId', {
        schoolId: dto.schoolId,
      })
      .andWhere('instructor.phone = :phone', {
        phone: dto.instructor.phone,
      })
      .getOne();

    return existingSam ? existingSam : null;
  }

  async groups(id: number): Promise<Group[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id },
      relations: ['groups', 'groups.groupStudents'],
    });

    return sam?.groups ?? [];
  }

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
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  async getDocuments(samId: number): Promise<Document[]> {
    return await this.documentRepository.find({
      where: {
        samId,
      },
    });
  }

  async findBySchedule(id: number, dates: string[]) {
    // 1. samId 기반  group 조회
    const groups = await this.groupRepository.find({
      where: {
        samId: id,
      },
      relations: ['sam', 'sam.instructor', 'schooldays'],
      select: {
        id: true,
        groupName: true,
        location: true,
        weekday: true,
        start: true,
        end: true,
        schooldays: {
          id: true,
          startsAt: true,
          endsAt: true,
          duration: true,
        },
        sam: {
          id: true,
          alias: true,
          instructor: {
            id: true,
            phone: true,
          },
        },
      },
    });

    // 2. 날짜별로 Group 그룹화
    const result: Record<string, Group[]> = {};
    dates.forEach((date) => {
      const koreanWeekday = getKoreanWeekday(date);
      result[`${date}(${koreanWeekday})`] = [];
    });

    console.log('result -->', result);

    // 3. 결과 값이 없을 경우 프론트에서 전달 받은 주단위 날짜 배열을 리턴
    if (!groups.length) {
      return transformScheduleResponse(dates, result);
    }

    groups.forEach((group) => {
      // schooldays에서 dates 배열에 포함된 날짜만 필터링
      const filteredSchooldays = group.schooldays.filter((day) => {
        const dayDate = day.startsAt.toISOString().split('T')[0]; // "2025-05-20T13:50:00Z" -> "2025-05-20"
        return dates.includes(dayDate);
      });

      // 필터링된 schooldays가 있는 경우, 각 날짜에 Group 추가
      filteredSchooldays.forEach((schoolday) => {
        const dayDate = schoolday.startsAt.toISOString().split('T')[0];
        const koreanWeekday = getKoreanWeekday(dayDate);
        if (dates.includes(dayDate)) {
          // Group 객체 기반 schooldays와 sam을 부분 객체로 구성
          result[`${dayDate}(${koreanWeekday})`].push({
            ...group,
            schooldays: [
              {
                id: schoolday.id,
                startsAt: schoolday.startsAt,
                endsAt: schoolday.endsAt,
                duration: schoolday.duration,
              } as Schoolday,
            ],
            sam: group.sam
              ? {
                  id: group.sam.id,
                  alias: group.sam.alias,
                  instructor: group.sam.instructor
                    ? {
                        id: group.sam.instructor.id,
                        phone: group.sam.instructor.phone,
                      }
                    : undefined,
                }
              : undefined,
          } as Group);
        }
      });
    });

    return transformScheduleResponse(dates, result);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateSamDto): Promise<Sam> {
    const sam = await this.samRepository.preload({
      ...dto,
      id,
    });
    if (!sam) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.samRepository.save(sam);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  // this is soft-delete
  async softDelete(id: number, dto: DeleteInstructorNoteDto): Promise<void> {
    await this.samRepository.update(
      { id },
      { note: dto.note, deletedAt: new Date() },
    );
  }

  // this is hard-delete
  async remove(id: number): Promise<Sam> {
    const sam = await this.findById(id);
    await this.samRepository.softRemove(sam);
    return sam;
  }
}
