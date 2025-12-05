import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Program } from '../program/entities/program.entity';
import { Syllabus } from '../syllabus/entities/syllabus.entity';
import { CreateWeekDto } from './dto/create-week.dto';
import { UpdateWeekDto } from './dto/update-week.dto';
import { Week } from './entities/week.entity';

@Injectable()
export class WeekService {
  private readonly cloudfrontUrl: string;

  constructor(
    @InjectRepository(Week)
    private readonly weekRepository: Repository<Week>,
    @InjectRepository(Syllabus)
    private readonly syllabusRepository: Repository<Syllabus>,
    private readonly configService: ConfigService,
  ) {
    this.cloudfrontUrl = this.configService.get<string>(
      'aws.cloudfrontUrl',
      'https://cdn.스쿨허브.kr', // fallback url
    );
  }

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

  async upsert(upsertWeekDto: CreateWeekDto): Promise<Week[]> {
    const { syllabusId, weekNumber, subject } = upsertWeekDto;

    // Syllabus 유효성 검증
    const syllabus = await this.syllabusRepository.findOne({
      where: { id: syllabusId },
    });

    if (!syllabus) {
      throw new NotFoundException(`Syllabus with id ${syllabusId} not found`);
    }

    // MySQL 8.0.20+ INSERT ... ON DUPLICATE KEY UPDATE 사용
    // syllabusId와 weekNumber의 unique constraint를 활용
    const query = `
      INSERT INTO weeks (syllabusId, weekNumber, subject, createdAt, updatedAt)
      VALUES (?, ?, ?, NOW(), NOW()) AS new
      ON DUPLICATE KEY UPDATE
        subject = new.subject,
        updatedAt = NOW()
    `;

    await this.weekRepository.query(query, [syllabusId, weekNumber, subject]);

    // upsert된 Week 조회
    const week = await this.weekRepository.findOne({
      where: { syllabusId, weekNumber },
      relations: ['syllabus'],
    });

    return [week!];
  }

  async upsertBulk(
    createWeekDtos: CreateWeekDto[],
  ): Promise<{ weekId: number; weekNumber: number }[]> {
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

    // Raw query를 사용한 bulk upsert
    // Unique constraint: syllabusId + weekNumber
    const queryParams: any[] = [];
    const valueStrings: string[] = [];

    createWeekDtos.forEach((dto) => {
      valueStrings.push('(?, ?, ?, ?, ?)');

      queryParams.push(
        dto.syllabusId,
        dto.weekNumber,
        dto.subject,
        dto.game ?? null,
        dto.gameDetail ? JSON.stringify(dto.gameDetail) : null,
      );
    });

    const query = `
      INSERT INTO weeks 
        (syllabusId, weekNumber, subject, game, gameDetail)
      VALUES ${valueStrings.join(', ')}
      ON DUPLICATE KEY UPDATE
        subject = VALUES(subject),
        game = VALUES(game),
        gameDetail = VALUES(gameDetail),
        updatedAt = CURRENT_TIMESTAMP
    `;

    await this.weekRepository.query(query, queryParams);

    // 생성/업데이트된 weeks 조회하여 반환
    const upsertedWeeks = await this.weekRepository.find({
      where: createWeekDtos.map((dto) => ({
        syllabusId: dto.syllabusId,
        weekNumber: dto.weekNumber,
      })),
    });

    const sortedWeeks = [...upsertedWeeks].sort(
      (a, b) => a.weekNumber - b.weekNumber,
    );

    if (sortedWeeks.length !== createWeekDtos.length) {
      throw new NotFoundException(`Some weeks were not created or updated`);
    }

    return sortedWeeks.map((v) => ({
      weekId: v.id,
      weekNumber: v.weekNumber,
    }));
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
      relations: ['syllabus', 'programs', 'story'],
    });

    if (!week) {
      throw new NotFoundException(`Week with id ${id} not found`);
    }

    // programs에 extraUrls 추가
    if (week.programs && week.programs.length > 0) {
      week.programs.forEach((program) => {
        this._addProgramExtraUrls(week.syllabusId, program);
      });
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

  //? ---------------------------------------------------------------------- ?//
  //? Private Helper Methods
  //? ---------------------------------------------------------------------- ?//

  /**
   * Program에 URL 속성들을 추가하는 공통 유틸 함수
   */
  private _addProgramExtraUrls(syllabusId: number, program: Program): Program {
    // 원본 객체에 직접 속성 추가 (TypeORM 직렬화 문제 방지)
    program.fullVideoUrl = this._getFullVideoUrl(syllabusId, program);
    program.fullAudioUrl = this._getFullAudioUrl(syllabusId, program);
    program.miniVideoUrl = this._getMiniVideoUrl(syllabusId, program);
    program.miniAudioUrl = this._getMiniAudioUrl(syllabusId, program);
    program.coverImageUrl = this._getCoverImageUrl(syllabusId, program);
    program.introImageUrl = this._getIntroImageUrl(syllabusId, program);
    program.introAudioUrl = this._getIntroAudioUrl(syllabusId, program);
    program.silhouetteImageUrl = this._getSilhouetteImageUrl(
      syllabusId,
      program,
    );
    program.silhouetteAudioUrl = this._getSilhouetteAudioUrl(
      syllabusId,
      program,
    );
    return program;
  }

  private _getFullVideoUrl(syllabusId: number, program: Program): string {
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/fullVideo/${program.slug}.mp4`;
  }

  private _getFullAudioUrl(syllabusId: number, program: Program): string {
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/fullVideo/${program.slug}.mp3`;
  }

  private _getMiniVideoUrl(syllabusId: number, program: Program): string {
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/miniVideo/${program.slug}.mp4`;
  }

  private _getMiniAudioUrl(syllabusId: number, program: Program): string {
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/miniVideo/${program.slug}.mp3`;
  }

  private _getCoverImageUrl(syllabusId: number, program: Program): string {
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/cover/${program.slug}.jpg`;
  }

  private _getIntroImageUrl(
    syllabusId: number,
    program: Program,
  ): string | null {
    if (!program.isScorable) return null;
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/intro/${program.slug}.png`;
  }

  private _getIntroAudioUrl(
    syllabusId: number,
    program: Program,
  ): string | null {
    if (!program.isScorable) return null;
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/intro/${program.slug}.mp3`;
  }

  private _getSilhouetteImageUrl(
    syllabusId: number,
    program: Program,
  ): string | null {
    if (!program.isScorable) return null;
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/silhouette/${program.slug}.png`;
  }

  private _getSilhouetteAudioUrl(
    syllabusId: number,
    program: Program,
  ): string | null {
    if (!program.isScorable) return null;
    return `${this.cloudfrontUrl}/syllabuses/${syllabusId}/week${program.weekNumber}/programs/silhouette/${program.slug}.mp3`;
  }
}
