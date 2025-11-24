import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Week } from '../week/entities/week.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { Story } from './entities/story.entity';

@Injectable()
export class StoryService {
  constructor(
    @InjectRepository(Story)
    private readonly storyRepository: Repository<Story>,
    @InjectRepository(Week)
    private readonly weekRepository: Repository<Week>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(createStoryDto: CreateStoryDto): Promise<Story> {
    const week = await this.weekRepository.findOne({
      where: { id: createStoryDto.weekId },
    });

    if (!week) {
      throw new NotFoundException(
        `Week with id ${createStoryDto.weekId} not found`,
      );
    }

    const story = this.storyRepository.create(createStoryDto);
    return await this.storyRepository.save(story);
  }

  async createBulk(createStoryDtos: CreateStoryDto[]): Promise<Story[]> {
    if (!createStoryDtos || createStoryDtos.length === 0) {
      return [];
    }

    // 모든 weekId를 수집하고 중복 제거
    const weekIds = [
      ...new Set(
        createStoryDtos
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

    // 모든 storys 생성
    const storys = this.storyRepository.create(createStoryDtos);
    return await this.storyRepository.save(storys);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async findAll(): Promise<Story[]> {
    return await this.storyRepository.find({
      relations: ['week', 'week.syllabus'],
      order: { createdAt: 'ASC' },
    });
  }

  async findBySyllabus(syllabusId: number): Promise<Story[]> {
    return await this.storyRepository.find({
      where: {
        week: {
          syllabusId,
        },
      },
      relations: ['week', 'week.syllabus'],
      order: { weekNumber: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Story> {
    const story = await this.storyRepository.findOne({
      where: { id },
      relations: ['week', 'week.syllabus'],
    });

    if (!story) {
      throw new NotFoundException(`Story with id ${id} not found`);
    }

    return story;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateStoryDto): Promise<Story> {
    const story = await this.findOne(id);

    if (dto.weekId && dto.weekId !== story.weekId) {
      const week = await this.weekRepository.findOne({
        where: { id: dto.weekId },
      });

      if (!week) {
        throw new NotFoundException(`Week with id ${dto.weekId} not found`);
      }
    }

    Object.assign(story, dto);
    return await this.storyRepository.save(story);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<void> {
    const story = await this.findOne(id);
    await this.storyRepository.softRemove(story);
  }
}
