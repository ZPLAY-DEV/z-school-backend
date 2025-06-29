import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { DeleteInstructorNoteDto } from 'src/domain/instructor/dto/delete-instructor-note.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
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

  async create(dto: CreateSamDto): Promise<Sam> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. 학교 존재 여부 확인
      const school = await manager.findOne(School, {
        where: { id: dto.schoolId },
      });

      if (!school) {
        throw new NotFoundException('School not found');
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

  async findGroupsById(id: number): Promise<Group[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id },
      relations: ['contracts', 'contracts.group'],
    });

    return sam?.contracts.map((contract) => contract.group) ?? [];
  }

  async findLessonsById(id: number): Promise<Lesson[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id },
      relations: ['contracts', 'contracts.lesson'],
    });
    // todo. deduplicate lessons
    return sam?.contracts.map((contract) => contract.lesson) ?? [];
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
      throw new NotFoundException(`Sam not found`);
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
