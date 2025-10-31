import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Syllabus } from 'src/domain/syllabus/entities/syllabus.entity';
import { Repository } from 'typeorm';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { Curriculum } from './entities/curriculum.entity';

@Injectable()
export class CurriculumService {
  constructor(
    @InjectRepository(Curriculum)
    private readonly curriculumRepository: Repository<Curriculum>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Syllabus)
    private readonly syllabusRepository: Repository<Syllabus>,
  ) {}

  async create(createCurriculumDto: CreateCurriculumDto): Promise<Curriculum> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: createCurriculumDto.lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(
        `Lesson with id ${createCurriculumDto.lessonId} not found`,
      );
    }

    const syllabus = await this.syllabusRepository.findOne({
      where: { id: createCurriculumDto.syllabusId },
    });

    if (!syllabus) {
      throw new NotFoundException(
        `Syllabus with id ${createCurriculumDto.syllabusId} not found`,
      );
    }

    const curriculum = this.curriculumRepository.create(createCurriculumDto);
    return await this.curriculumRepository.save(curriculum);
  }

  async findAll(): Promise<Curriculum[]> {
    return await this.curriculumRepository.find({
      relations: ['lesson', 'syllabus'],
    });
  }

  async findOne(id: number): Promise<Curriculum> {
    const curriculum = await this.curriculumRepository.findOne({
      where: { id },
      relations: ['lesson', 'syllabus'],
    });

    if (!curriculum) {
      throw new NotFoundException(`Curriculum with id ${id} not found`);
    }

    return curriculum;
  }

  async findByLesson(lessonId: number): Promise<Curriculum[]> {
    return await this.curriculumRepository.find({
      where: { lessonId },
      relations: ['syllabus'],
    });
  }

  async findBySyllabus(syllabusId: number): Promise<Curriculum[]> {
    return await this.curriculumRepository.find({
      where: { syllabusId },
      relations: ['lesson'],
    });
  }

  async update(
    id: number,
    updateCurriculumDto: UpdateCurriculumDto,
  ): Promise<Curriculum> {
    const curriculum = await this.findOne(id);

    if (
      updateCurriculumDto.lessonId &&
      updateCurriculumDto.lessonId !== curriculum.lessonId
    ) {
      const lesson = await this.lessonRepository.findOne({
        where: { id: updateCurriculumDto.lessonId },
      });

      if (!lesson) {
        throw new NotFoundException(
          `Lesson with id ${updateCurriculumDto.lessonId} not found`,
        );
      }
    }

    if (
      updateCurriculumDto.syllabusId &&
      updateCurriculumDto.syllabusId !== curriculum.syllabusId
    ) {
      const syllabus = await this.syllabusRepository.findOne({
        where: { id: updateCurriculumDto.syllabusId },
      });

      if (!syllabus) {
        throw new NotFoundException(
          `Syllabus with id ${updateCurriculumDto.syllabusId} not found`,
        );
      }
    }

    Object.assign(curriculum, updateCurriculumDto);
    return await this.curriculumRepository.save(curriculum);
  }

  async remove(id: number): Promise<void> {
    const curriculum = await this.findOne(id);
    await this.curriculumRepository.softRemove(curriculum);
  }
}
