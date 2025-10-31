import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { In, Repository } from 'typeorm';
import { Curriculum } from '../curriculum/entities/curriculum.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { CreateSyllabusDto } from './dto/create-syllabus.dto';
import { UpdateSyllabusDto } from './dto/update-syllabus.dto';
import { Syllabus } from './entities/syllabus.entity';

@Injectable()
export class SyllabusService {
  constructor(
    @InjectRepository(Syllabus)
    private readonly syllabusRepository: Repository<Syllabus>,
    @InjectRepository(Curriculum)
    private readonly curriculumRepository: Repository<Curriculum>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async create(createSyllabusDto: CreateSyllabusDto): Promise<Syllabus> {
    const syllabus = this.syllabusRepository.create(createSyllabusDto);
    return await this.syllabusRepository.save(syllabus);
  }

  async list(): Promise<Syllabus[]> {
    return await this.syllabusRepository.find({
      relations: ['curricula', 'curricula.lesson', 'programs'],
      order: { createdAt: 'DESC' },
    });
  }

  async infiniteList(query: PaginateQuery): Promise<Paginated<Syllabus>> {
    const queryBuilder = this.syllabusRepository.createQueryBuilder('syllabus');

    return await paginate<Syllabus>(query, queryBuilder, {
      relations: ['programs'],
      sortableColumns: ['createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: number): Promise<Syllabus> {
    const syllabus = await this.syllabusRepository.findOne({
      where: { id },
      relations: ['curricula', 'curricula.lesson', 'programs'],
    });

    if (!syllabus) {
      throw new NotFoundException(`Syllabus with id ${id} not found`);
    }

    return syllabus;
  }

  async update(
    id: number,
    updateSyllabusDto: UpdateSyllabusDto,
  ): Promise<Syllabus> {
    const syllabus = await this.findOne(id);
    Object.assign(syllabus, updateSyllabusDto);
    return await this.syllabusRepository.save(syllabus);
  }

  async remove(id: number): Promise<void> {
    const syllabus = await this.findOne(id);
    await this.syllabusRepository.softRemove(syllabus);
  }

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
      const curricula = newLessons.map((lesson) =>
        this.curriculumRepository.create({
          syllabusId: id,
          lessonId: lesson.id,
        }),
      );

      await this.curriculumRepository.save(curricula);
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
}
