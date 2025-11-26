import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Syllabus } from 'src/domain/syllabus/entities/syllabus.entity';
import { generateSlug } from 'src/helpers/formatter';
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
    @InjectRepository(Syllabus)
    private readonly syllabusRepository: Repository<Syllabus>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateProgramDto): Promise<Program> {
    // Syllabus 존재 유무 검증
    if (dto.syllabusId) {
      const syllabus = await this.syllabusRepository.findOne({
        where: { id: dto.syllabusId },
      });

      if (!syllabus) {
        throw new NotFoundException(
          `Syllabus with id ${dto.syllabusId} not found`,
        );
      }
    }

    // Week 존재 유무 검증
    const week = await this.weekRepository.findOne({
      where: { id: dto.weekId },
    });

    if (!week) {
      throw new NotFoundException(`Week with id ${dto.weekId} not found`);
    }

    // slug가 없거나 null이거나 빈 문자열이면 name으로 생성
    if (!dto.slug || dto.slug === '') {
      dto.slug = generateSlug(dto.name);
    }

    const program = this.programRepository.create(dto);
    return await this.programRepository.save(program);
  }

  async upsertBulk(dtos: CreateProgramDto[]): Promise<Program[]> {
    if (!dtos || dtos.length === 0) {
      return [];
    }

    // 모든 syllabusId를 수집하고 중복 제거
    const syllabusIds = [
      ...new Set(
        dtos
          .map((dto) => dto.syllabusId)
          .filter((id): id is number => id !== undefined),
      ),
    ];

    // syllabusId 유효성 검증
    if (syllabusIds.length > 0) {
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
    }

    // 모든 weekId를 수집하고 중복 제거
    const weekIds = [
      ...new Set(
        dtos
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

    // 각 DTO의 slug가 없거나 null이거나 빈 문자열이면 name으로 생성
    dtos.forEach((dto) => {
      if (!dto.slug || dto.slug === '') {
        dto.slug = generateSlug(dto.name);
      }
    });

    // Raw query를 사용한 bulk upsert
    // Unique constraint: syllabusId + weekId + slug
    const queryParams: any[] = [];
    const valueStrings: string[] = [];

    dtos.forEach((dto) => {
      valueStrings.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

      queryParams.push(
        dto.syllabusId,
        dto.weekId,
        dto.weekNumber ?? 0,
        dto.name,
        dto.slug,
        dto.type,
        dto.tags ? dto.tags.join(',') : null,
        dto.scripts ? JSON.stringify(dto.scripts) : null,
        dto.level,
        dto.orientation ?? 'CENTER',
        dto.index,
        dto.isScorable ? 1 : 0,
        dto.imageUrl ?? null,
        dto.fullVideoUrl ?? null,
        dto.miniVideoUrl ?? null,
        dto.audioUrl ?? null,
      );
    });

    const query = `
      INSERT INTO programs 
        (syllabusId, weekId, weekNumber, name, slug, type, tags, scripts, level, orientation, \`index\`, isScorable, imageUrl, videoUrl, audioUrl)
      VALUES ${valueStrings.join(', ')}
      ON DUPLICATE KEY UPDATE
        weekNumber = VALUES(weekNumber),
        name = VALUES(name),
        type = VALUES(type),
        tags = VALUES(tags),
        scripts = VALUES(scripts),
        level = VALUES(level),
        orientation = VALUES(orientation),
        \`index\` = VALUES(\`index\`),
        isScorable = VALUES(isScorable),
        imageUrl = VALUES(imageUrl),
        fullVideoUrl = VALUES(fullVideoUrl),
        miniVideoUrl = VALUES(miniVideoUrl),
        audioUrl = VALUES(audioUrl),
        updatedAt = CURRENT_TIMESTAMP
    `;

    await this.programRepository.query(query, queryParams);

    // 생성/업데이트된 programs 조회하여 반환
    const createdPrograms = await this.programRepository.find({
      where: dtos.map((dto) => ({
        syllabusId: dto.syllabusId,
        weekId: dto.weekId,
        slug: dto.slug,
      })),
      relations: ['week', 'week.syllabus'],
    });

    return createdPrograms;
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
    await this.programRepository.remove(program);
  }
}
