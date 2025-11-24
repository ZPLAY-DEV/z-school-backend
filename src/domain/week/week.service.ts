import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Syllabus } from '../syllabus/entities/syllabus.entity';
import { CreateWeekDto } from './dto/create-week.dto';
import { UpdateWeekDto } from './dto/update-week.dto';
import { Week } from './entities/week.entity';

@Injectable()
export class WeekService {
  constructor(
    @InjectRepository(Week)
    private readonly weekRepository: Repository<Week>,
    @InjectRepository(Syllabus)
    private readonly syllabusRepository: Repository<Syllabus>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(createWeekDto: CreateWeekDto): Promise<Week> {
    const syllabus = await this.syllabusRepository.findOne({
      where: { id: createWeekDto.syllabusId },
    });

    if (!syllabus) {
      throw new NotFoundException(
        `Syllabus with id ${createWeekDto.syllabusId} not found`,
      );
    }

    const week = this.weekRepository.create(createWeekDto);
    return await this.weekRepository.save(week);
  }

  async createBulk(createWeekDtos: CreateWeekDto[]): Promise<Week[]> {
    if (!createWeekDtos || createWeekDtos.length === 0) {
      return [];
    }

    // 모든 syllabusId를 수집하고 중복 제거
    const syllabusIds = [
      ...new Set(
        createWeekDtos
          .map((dto) => dto.syllabusId)
          .filter((id): id is number => id !== undefined),
      ),
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

    // 모든 weeks 생성
    const weeks = this.weekRepository.create(createWeekDtos);
    return await this.weekRepository.save(weeks);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findAll(): Promise<Week[]> {
    return await this.weekRepository.find({
      relations: ['syllabus', 'programs'],
      order: { createdAt: 'ASC' },
    });
  }

  async findBySyllabus(syllabusId: number): Promise<Week[]> {
    return await this.weekRepository.find({
      where: { syllabusId },
      relations: ['programs'],
      order: { weekNumber: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Week> {
    const week = await this.weekRepository.findOne({
      where: { id },
      relations: ['syllabus', 'programs'],
    });

    if (!week) {
      throw new NotFoundException(`Week with id ${id} not found`);
    }

    return week;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, updateWeekDto: UpdateWeekDto): Promise<Week> {
    const week = await this.findOne(id);

    if (
      updateWeekDto.syllabusId &&
      updateWeekDto.syllabusId !== week.syllabusId
    ) {
      const syllabus = await this.syllabusRepository.findOne({
        where: { id: updateWeekDto.syllabusId },
      });

      if (!syllabus) {
        throw new NotFoundException(
          `Syllabus with id ${updateWeekDto.syllabusId} not found`,
        );
      }
    }

    Object.assign(week, updateWeekDto);
    return await this.weekRepository.save(week);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<void> {
    const week = await this.findOne(id);
    await this.weekRepository.softRemove(week);
  }
}
