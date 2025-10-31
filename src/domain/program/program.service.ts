import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async remove(id: number): Promise<void> {
    const program = await this.findOne(id);
    await this.programRepository.softRemove(program);
  }
}
