import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Syllabus } from '../syllabus/entities/syllabus.entity';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Program } from './entities/program.entity';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(Syllabus)
    private readonly syllabusRepository: Repository<Syllabus>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(createProgramDto: CreateProgramDto): Promise<Program> {
    const syllabus = await this.syllabusRepository.findOne({
      where: { id: createProgramDto.syllabusId },
    });

    if (!syllabus) {
      throw new NotFoundException(
        `Syllabus with id ${createProgramDto.syllabusId} not found`,
      );
    }

    const program = this.programRepository.create(createProgramDto);
    return await this.programRepository.save(program);
  }

  async bulkCreate(createProgramDtos: CreateProgramDto[]): Promise<Program[]> {
    if (!createProgramDtos || createProgramDtos.length === 0) {
      return [];
    }

    // 모든 syllabusId를 수집하고 중복 제거
    const syllabusIds = [
      ...new Set(createProgramDtos.map((dto) => dto.syllabusId)),
    ];

    // syllabusId 유효성 검증
    const syllabuses = await this.syllabusRepository.find({
      where: { id: In(syllabusIds) },
    });

    if (syllabuses.length !== syllabusIds.length) {
      const foundIds = syllabuses.map((s) => s.id);
      const missingIds = syllabusIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Syllabus with id(s) ${missingIds.join(', ')} not found`,
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
      relations: ['syllabus'],
      order: { week: 'ASC', createdAt: 'ASC' },
    });
  }

  async findByCurriculum(syllabusId: number): Promise<Program[]> {
    const syllabus = await this.syllabusRepository.findOne({
      where: { id: syllabusId },
    });

    if (!syllabus) {
      throw new NotFoundException(`Syllabus with id ${syllabusId} not found`);
    }

    return await this.programRepository.find({
      where: { syllabusId },
      order: { week: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Program> {
    const program = await this.programRepository.findOne({
      where: { id },
      relations: ['syllabus'],
    });

    if (!program) {
      throw new NotFoundException(`Program with id ${id} not found`);
    }

    return program;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(
    id: number,
    updateProgramDto: UpdateProgramDto,
  ): Promise<Program> {
    const program = await this.findOne(id);

    if (
      updateProgramDto.syllabusId &&
      updateProgramDto.syllabusId !== program.syllabusId
    ) {
      const syllabus = await this.syllabusRepository.findOne({
        where: { id: updateProgramDto.syllabusId },
      });

      if (!syllabus) {
        throw new NotFoundException(
          `Syllabus with id ${updateProgramDto.syllabusId} not found`,
        );
      }
    }

    Object.assign(program, updateProgramDto);
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
