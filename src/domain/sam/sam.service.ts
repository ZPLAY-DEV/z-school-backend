import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
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
        // 새로운 강사 생성
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

  async findGroupsById(id: number, termId?: number): Promise<Group[]> {
    const sam = await this.samRepository.findOneOrFail({
      where: { id },
      relations: ['contracts', 'contracts.group', 'contracts.group.lesson'],
    });

    if (termId) {
      sam.contracts = sam.contracts.filter(
        (contract) => contract.group.lesson.termId === Number(termId),
      );
    }

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
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Sam 존재 여부 확인
      const existingSam = await manager.findOne(Sam, {
        where: { id },
        relations: ['instructor'],
      });

      if (!existingSam) {
        throw new NotFoundException(`Sam not found`);
      }

      // 2. instructor 정보가 있으면 업데이트
      if (dto.instructor) {
        await manager.update(
          Instructor,
          { id: existingSam.instructorId },
          dto.instructor,
        );
      }

      // 3. Sam 정보 업데이트 (instructor 정보 제외)
      const samUpdateData = {
        alias: dto.alias,
        score: dto.score,
        editFeePermission: dto.editFeePermission,
        editPickPermission: dto.editPickPermission,
        note: dto.note,
      };

      const sam = await manager.preload(Sam, {
        ...samUpdateData,
        id,
      });

      if (!sam) {
        throw new NotFoundException(`Sam not found`);
      }

      await manager.save(Sam, sam);

      // 4. 업데이트된 Sam 조회 및 반환
      return await manager.findOneOrFail(Sam, {
        where: { id },
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
}
