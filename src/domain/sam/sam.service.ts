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

@Injectable()
export class SamService {
  private readonly logger = new Logger(SamService.name);

  constructor(
    @InjectRepository(Sam)
    private readonly samRepository: Repository<Sam>,
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
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

      if (dto.instructor) {
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
          alias: dto.alias,
          score: dto.score,
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

  async dryRun(dto: CreateSamDto): Promise<Sam | null> {
    // In dryRun mode, we check if the instructor exists but don't create it
    if (dto.instructor) {
      const existingInstructor = await this.instructorRepository.findOne({
        where: { phone: dto.instructor.phone },
      });

      if (existingInstructor) {
        dto.instructorId = existingInstructor.id;
      } else {
        const newInstructor = this.samRepository.create(dto.instructor);
        await this.samRepository.save(newInstructor);
        dto.instructorId = newInstructor.id;
      }
    }
    const existingSam = await this.samRepository
      .createQueryBuilder('sam')
      .where('sam.schoolId = :schoolId', {
        schoolId: dto.schoolId,
      })
      .andWhere('sam.instructorId = :instructorId', {
        instructorId: dto.instructorId,
      })
      .andWhere('sam.alias = :alias', {
        alias: dto.alias,
      })
      .getOne();

    return existingSam ? existingSam : null;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(samId: number): Promise<Group[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id: samId },
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
