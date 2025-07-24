import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Region } from 'src/common/enums';
import { School } from 'src/domain/school/entities/school.entity';
import { S3Service } from 'src/services/aws/s3.service';
import { In, Repository } from 'typeorm';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { Lesson } from '../lesson/entities/lesson.entity';

@Injectable()
export class SchoolService {
  private readonly logger = new Logger(SchoolService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    private readonly s3Service: S3Service,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSchoolDto): Promise<School> {
    if (dto.schoolCode) {
      const existingSchool = await this.schoolRepository.findOne({
        where: { schoolCode: dto.schoolCode },
      });
      if (existingSchool) {
        Object.assign(existingSchool, dto);
        return await this.schoolRepository.save(existingSchool);
      }
    }

    const school = this.schoolRepository.create(dto);
    return await this.schoolRepository.save(school);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  // regions별 전체 리스트
  async list(region: Region | null): Promise<School[]> {
    const queryBuilder = region
      ? this.schoolRepository
          .createQueryBuilder('school')
          .where('school.region = :region', { region })
          .orderBy('id', 'DESC')
      : this.schoolRepository
          .createQueryBuilder('school')
          .orderBy('id', 'DESC');

    return await queryBuilder.getMany();
  }

  async infiniteList(query: PaginateQuery): Promise<Paginated<School>> {
    const queryBuilder = this.schoolRepository.createQueryBuilder('school');

    return await paginate(query, queryBuilder, {
      relations: {
        terms: true,
        statements: true,
        calendars: true,
      },
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        region: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }

  async findById(id: number, relations: string[] = []): Promise<School> {
    try {
      return relations.length > 0
        ? await this.schoolRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.schoolRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(`School not found`);
    }
  }

  async getByIds(ids: number[]): Promise<School[]> {
    return await this.schoolRepository.find({
      where: { id: In(ids) },
      relations: ['options'],
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateSchoolDto) {
    const school = await this.schoolRepository.preload({
      id,
      ...dto,
    });

    if (!school) {
      throw new NotFoundException(`School not found`);
    }

    return await this.schoolRepository.save(school);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<School> {
    const school = await this.findById(id);
    return await this.schoolRepository.remove(school);
  }

  async getLessons(id: number): Promise<Lesson[]> {
    const school = await this.findById(id, ['lessons']);
    if (!school.lessons || school.lessons.length === 0) {
     return [];
    }
    return school.lessons;
  }

  async deleteFromS3(url: string): Promise<void> {
    await this.s3Service.delete(url);
  }
}
