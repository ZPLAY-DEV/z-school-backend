import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { generateSlug } from 'src/helpers/formatter';
import { In, Repository } from 'typeorm';
import { Curriculum } from '../curriculum/entities/curriculum.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Program } from '../program/entities/program.entity';
import { Week } from '../week/entities/week.entity';
import { CreateSyllabusWithWeeksDto } from './dto/create-syllabus.dto';
import { UpdateSyllabusDto } from './dto/update-syllabus.dto';
import { Syllabus } from './entities/syllabus.entity';

@Injectable()
export class SyllabusService {
  private readonly cloudfrontUrl: string;

  constructor(
    @InjectRepository(Syllabus)
    private readonly syllabusRepository: Repository<Syllabus>,
    @InjectRepository(Curriculum)
    private readonly curriculumRepository: Repository<Curriculum>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Week)
    private readonly weekRepository: Repository<Week>,
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
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

  async create(dto: CreateSyllabusWithWeeksDto): Promise<Syllabus> {
    // CreateSyllabusWithWeeksDto에서 weeks 분리
    const { weeks, ...syllabusData } = dto;

    // slug가 없거나 null이거나 빈 문자열이면 name으로 생성
    if (!syllabusData.slug || syllabusData.slug === '') {
      syllabusData.slug = generateSlug(syllabusData.name);
    }

    // Syllabus 생성
    const syllabus = await this.syllabusRepository.save(
      this.syllabusRepository.create(syllabusData),
    );

    // weeks가 있으면 weeks와 programs를 함께 생성
    if (weeks && weeks.length > 0) {
      await this._createWeeksWithPrograms(syllabus.id, weeks);
    } else if (syllabusData.weekCount) {
      // weeks가 없고 weekCount만 있으면 빈 weeks 생성 (기존 로직)
      for (let i = 1; i <= syllabusData.weekCount; i++) {
        const week = this.weekRepository.create({
          syllabusId: syllabus.id,
          subject: ``,
          weekNumber: i,
        });
        await this.weekRepository.save(week);
      }
    }

    return await this.findOne(syllabus.id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(): Promise<Syllabus[]> {
    return await this.syllabusRepository.find({
      relations: [
        'curriculums',
        'curriculums.lesson',
        'weeks',
        'weeks.programs',
        'weeks.story',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async infiniteList(query: PaginateQuery): Promise<Paginated<Syllabus>> {
    const queryBuilder = this.syllabusRepository.createQueryBuilder('syllabus');

    return await paginate<Syllabus>(query, queryBuilder, {
      relations: ['weeks', 'weeks.programs'],
      sortableColumns: ['createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: number): Promise<Syllabus> {
    const syllabus = await this.syllabusRepository.findOne({
      where: { id },
      relations: [
        'curriculums',
        'curriculums.lesson',
        'weeks',
        'weeks.programs',
        'weeks.story',
      ],
      order: {
        weeks: {
          id: 'ASC',
          programs: {
            index: 'ASC',
          },
        },
      },
    });

    if (!syllabus) {
      throw new NotFoundException(`Syllabus with id ${id} not found`);
    }

    // extraFields 추가
    if (syllabus.weeks) {
      syllabus.weeks.forEach((week) => {
        if (week.programs && week.programs.length > 0) {
          week.programs.forEach((program) => {
            this._addProgramExtraUrls(id, program);
          });
        }
      });
    }

    return syllabus;
  }

  async findPrograms(
    id: number,
    isScorable?: boolean,
    weekNumber?: number,
  ): Promise<Program[]> {
    // Syllabus 존재 여부 확인
    await this.findOne(id);

    const queryBuilder = this.programRepository
      .createQueryBuilder('program')
      .where('program.syllabusId = :syllabusId', { syllabusId: id })
      .orderBy('program.weekNumber', 'ASC')
      .addOrderBy('program.index', 'ASC');

    if (isScorable !== undefined) {
      queryBuilder.andWhere('program.isScorable = :isScorable', {
        isScorable,
      });
    }
    if (weekNumber !== undefined) {
      queryBuilder.andWhere('program.weekNumber = :weekNumber', {
        weekNumber,
      });
    }

    const programs = await queryBuilder.getMany();

    // 각 program에 URL 추가 (공통 유틸 함수 사용)
    return programs.map((program) => this._addProgramExtraUrls(id, program));
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(
    id: number,
    updateSyllabusDto: UpdateSyllabusDto,
  ): Promise<Syllabus> {
    const syllabus = await this.findOne(id);

    // Syllabus 기본 필드 업데이트
    const { weeks, ...syllabusFields } = updateSyllabusDto;
    Object.assign(syllabus, syllabusFields);
    await this.syllabusRepository.save(syllabus);

    // Weeks와 Programs 업데이트 처리
    if (weeks !== undefined) {
      await this._updateWeeksAndPrograms(id, weeks);
    }

    return await this.findOne(id);
  }

  async updateWeeks(id: number, count: number): Promise<Syllabus> {
    // syllabus 존재 여부 및 현재 weeks 조회
    await this.findOne(id);

    const existingWeeks = await this.weekRepository.find({
      where: { syllabusId: id },
      order: { weekNumber: 'ASC' },
    });

    const currentCount = existingWeeks.length;

    if (currentCount === count) {
      throw new BadRequestException(
        '요청한 주차 수가 현재 주차 수와 동일합니다.',
      );
    }

    if (count > currentCount) {
      // 현재 주차 뒤에 weekCount 개수만큼 주차를 추가
      const offset = count - currentCount;
      const start = currentCount + 1;
      const end = currentCount + offset;

      for (let i = start; i <= end; i++) {
        const week = this.weekRepository.create({
          syllabusId: id,
          weekNumber: i,
          subject: '',
          game: null,
          gameDetail: null,
        } as Partial<Week>);

        await this.weekRepository.save(week);
      }

      // 그리고! 여기, syllabus의 weekCount 업데이트
      await this.syllabusRepository.update(id, { weekCount: count });
    } else {
      // type === 'remove' 인 경우, 뒤에서부터 weekCount 개수만큼 삭제
      if (existingWeeks.length > 0 && count > 0) {
        const weeksToRemove = [...existingWeeks]
          .sort((a, b) => b.weekNumber - a.weekNumber)
          .slice(0, count);

        if (weeksToRemove.length > 0) {
          await this.weekRepository.softRemove(weeksToRemove);
        }
      }
    }

    return await this.findOne(id);
  }

  private async _createWeeksWithPrograms(
    syllabusId: number,
    weeksData: CreateSyllabusWithWeeksDto['weeks'],
  ): Promise<void> {
    if (!weeksData || weeksData.length === 0) {
      return;
    }

    for (const weekData of weeksData) {
      const { programs, ...weekFields } = weekData;

      // 새로운 week 생성
      const newWeek = this.weekRepository.create({
        ...weekFields,
        syllabusId,
      } as Partial<Week>);
      const savedWeek = await this.weekRepository.save(newWeek);

      // Programs 생성
      if (programs && programs.length > 0) {
        for (let i = 0; i < programs.length; i++) {
          const programData = programs[i];
          const resolvedIndex =
            programData.index !== undefined ? programData.index : i;

          const newProgram = this.programRepository.create({
            ...programData,
            weekId: savedWeek.id,
            index: resolvedIndex,
          } as Partial<Program>);

          await this.programRepository.save(newProgram);
        }
      }
    }
  }

  private async _updateWeeksAndPrograms(
    syllabusId: number,
    weeksData: NonNullable<UpdateSyllabusDto['weeks']>,
  ): Promise<void> {
    if (weeksData.length === 0) {
      // weeks가 빈 배열이면 모든 weeks 삭제
      const existingWeeks = await this.weekRepository.find({
        where: { syllabusId },
      });
      if (existingWeeks.length > 0) {
        await this.weekRepository.softRemove(existingWeeks);
      }
      return;
    }

    // 기존 weeks 조회
    const existingWeeks = await this.weekRepository.find({
      where: { syllabusId },
      relations: ['programs'],
    });

    const incomingWeekIds = weeksData
      .map((w) => w.id)
      .filter((id): id is number => typeof id === 'number');

    // 삭제할 weeks (기존에 있지만 새로운 데이터에 없는 것들)
    const weeksToDelete = existingWeeks.filter(
      (w) => !incomingWeekIds.includes(w.id),
    );
    if (weeksToDelete.length > 0) {
      await this.weekRepository.softRemove(weeksToDelete);
    }

    // 각 week 처리
    for (const weekData of weeksData) {
      const { programs, ...weekFields } = weekData;

      if (weekData.id) {
        // 기존 week 업데이트
        const existingWeek = existingWeeks.find((w) => w.id === weekData.id);
        if (existingWeek) {
          Object.assign(existingWeek, {
            ...weekFields,
            syllabusId, // syllabusId는 항상 현재 syllabus로 설정
          });

          // programs relation 제거 (cascade로 기존 index가 덮어씌워지는 것 방지)
          (existingWeek as any).programs = undefined;
          await this.weekRepository.save(existingWeek);

          // Programs 업데이트 처리 (week 저장 후 실행)
          if (programs !== undefined) {
            await this._updatePrograms(weekData.id, programs);
          }
        }
      } else {
        // 새로운 week 생성
        const newWeek = this.weekRepository.create({
          ...weekFields,
          syllabusId,
        } as Partial<Week>);
        const savedWeek = await this.weekRepository.save(newWeek);

        // Programs 처리 (id 유무에 따라 업데이트/생성 분기)
        if (programs && programs.length > 0) {
          await this._updatePrograms(savedWeek.id, programs);
        }
      }
    }
  }

  private async _updatePrograms(
    weekId: number,
    programsData: NonNullable<
      NonNullable<UpdateSyllabusDto['weeks']>[0]['programs']
    >,
  ): Promise<void> {
    // 기존 programs 조회
    const existingPrograms = await this.programRepository.find({
      where: { weekId },
    });

    const incomingProgramIds: number[] = programsData
      .map((p) => p.id)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    // 삭제할 programs (기존에 있지만 새로운 데이터에 없는 것들)
    const programsToDelete = existingPrograms.filter(
      (p) => !incomingProgramIds.includes(p.id),
    );
    if (programsToDelete.length > 0) {
      await this.programRepository.softRemove(programsToDelete);
    }

    // 각 program 처리 - FE에서 전달되는 순서대로 항상 index를 0부터 갱신
    for (let orderIndex = 0; orderIndex < programsData.length; orderIndex++) {
      const programData = programsData[orderIndex];
      const resolvedIndex = orderIndex;

      if (programData.id) {
        // 기존 program 업데이트 - repository.update()를 사용하여 직접 업데이트
        const updateData: Partial<Program> = {
          weekId, // weekId는 항상 현재 week로 설정
          index: resolvedIndex,
        };

        // programData에서 undefined가 아닌 필드만 업데이트 데이터에 포함
        if (programData.name !== undefined) {
          updateData.name = programData.name;
        }
        if (programData.type !== undefined) {
          updateData.type = programData.type;
        }
        if (programData.tags !== undefined) {
          updateData.tags = programData.tags;
        }
        if (programData.level !== undefined) {
          updateData.level = programData.level;
        }
        if (programData.isScorable !== undefined) {
          updateData.isScorable = programData.isScorable;
        }
        if (programData.scripts !== undefined) {
          updateData.scripts = programData.scripts;
        }
        if (programData.imageUrl !== undefined) {
          updateData.imageUrl = programData.imageUrl;
        }

        await this.programRepository.update(programData.id, updateData);
      } else {
        // 새로운 program 생성 - id를 제거하고 나머지 필드만 사용
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...programFields } = programData;
        const createData: Partial<Program> = {
          ...programFields,
          weekId,
          index: resolvedIndex,
        };

        const newProgram = this.programRepository.create(createData);
        await this.programRepository.save(newProgram);
      }
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<void> {
    const syllabus = await this.findOne(id);
    await this.syllabusRepository.softRemove(syllabus);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Manage Curriculums
  //? ---------------------------------------------------------------------- ?//

  async addLessons(id: number, lessonIds: number[]): Promise<Syllabus> {
    // Syllabus 존재 여부 확인
    await this.findOne(id);

    const lessons = await this.lessonRepository.find({
      where: { id: In(lessonIds) },
    });

    if (lessons.length !== lessonIds.length) {
      throw new NotFoundException('일부 레슨을 찾을 수 없습니다');
    }

    // 기존 Curriculum 조회
    const existingCurricula = await this.curriculumRepository.find({
      where: { syllabusId: id },
    });
    const existingLessonIds = existingCurricula.map((c) => c.lessonId);

    // 중복되지 않는 새로운 레슨만 추가
    const newLessons = lessons.filter(
      (lesson) => !existingLessonIds.includes(lesson.id),
    );

    if (newLessons.length > 0) {
      const curriculums = newLessons.map((lesson) =>
        this.curriculumRepository.create({
          syllabusId: id,
          lessonId: lesson.id,
        }),
      );

      await this.curriculumRepository.save(curriculums);
    }

    return await this.findOne(id);
  }

  async removeLessons(id: number, lessonIds: number[]): Promise<Syllabus> {
    await this.findOne(id); // 존재 여부 확인

    // 해당 lessonIds에 해당하는 Curriculum 삭제
    await this.curriculumRepository.delete({
      syllabusId: id,
      lessonId: In(lessonIds),
    });

    return await this.findOne(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Private Helper Methods
  //? ---------------------------------------------------------------------- ?//

  /**
   * Program에 URL 속성들을 추가하는 공통 유틸 함수
   * findOne()과 findPrograms()에서 공통으로 사용
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
