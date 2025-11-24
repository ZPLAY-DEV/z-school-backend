import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Week } from '../week/entities/week.entity';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Program } from './entities/program.entity';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(Week)
    private readonly weekRepository: Repository<Week>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(createProgramDto: CreateProgramDto): Promise<Program> {
    const week = await this.weekRepository.findOne({
      where: { id: createProgramDto.weekId },
    });

    if (!week) {
      throw new NotFoundException(
        `Week with id ${createProgramDto.weekId} not found`,
      );
    }

    const program = this.programRepository.create(createProgramDto);
    return await this.programRepository.save(program);
  }

  async createBulk(createProgramDtos: CreateProgramDto[]): Promise<Program[]> {
    if (!createProgramDtos || createProgramDtos.length === 0) {
      return [];
    }

    // 모든 weekId를 수집하고 중복 제거
    const weekIds = [
      ...new Set(
        createProgramDtos
          .map((dto) => dto.weekId)
          .filter((id): id is number => id !== undefined),
      ),
    ];

    // weekId 유효성 검증
    const weeks = await this.weekRepository.find({
      where: { id: In(weekIds) },
    });

    if (weeks.length !== weekIds.length) {
      const foundIds = weeks.map((w) => w.id);
      const missingIds = weekIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Week with id(s) ${missingIds.join(', ')} not found`,
      );
    }

    // 모든 programs 생성
    const programs = this.programRepository.create(createProgramDtos);
    return await this.programRepository.save(programs);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findAll(): Promise<Program[]> {
    return await this.programRepository.find({
      relations: ['week', 'week.syllabus'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByCurriculum(syllabusId: number): Promise<Program[]> {
    const weeks = await this.weekRepository.find({
      where: { syllabusId },
      relations: ['programs'],
      order: { weekNumber: 'ASC' },
    });

    // 모든 weeks의 programs를 평탄화하고 week 정보와 함께 매핑
    const programsWithWeek = weeks.flatMap((week) =>
      (week.programs || []).map((program) => ({ program, week })),
    );

    // week.weekNumber 순서로 정렬, 같은 week 내에서는 createdAt 순서로 정렬
    return programsWithWeek
      .sort((a, b) => {
        const weekDiff = a.week.weekNumber - b.week.weekNumber;
        if (weekDiff !== 0) return weekDiff;
        return a.program.createdAt.getTime() - b.program.createdAt.getTime();
      })
      .map((item) => item.program);
  }

  async findOne(id: number): Promise<Program> {
    const program = await this.programRepository.findOne({
      where: { id },
      relations: ['week', 'week.syllabus'],
    });

    if (!program) {
      throw new NotFoundException(`Program with id ${id} not found`);
    }

    return program;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateProgramDto): Promise<Program> {
    const program = await this.findOne(id);

    if (dto.weekId && dto.weekId !== program.weekId) {
      const week = await this.weekRepository.findOne({
        where: { id: dto.weekId },
      });

      if (!week) {
        throw new NotFoundException(`Week with id ${dto.weekId} not found`);
      }
    }

    Object.assign(program, dto);
    return await this.programRepository.save(program);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<void> {
    const program = await this.findOne(id);
    await this.programRepository.softRemove(program);
  }
}
