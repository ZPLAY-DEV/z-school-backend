import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Region } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { School } from 'src/domain/school/entities/school.entity';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, In, Repository } from 'typeorm';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolService {
  private readonly logger = new Logger(SchoolService.name);

  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    private readonly s3Service: S3Service,
    private dataSource: DataSource, // for transaction
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create (basically Upsert)
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateSchoolDto): Promise<School> {
    if (dto.schoolCode) {
      // If id is provided, try to find the existing school
      const existingSchool = await this.schoolRepository.findOne({
        where: { schoolCode: dto.schoolCode },
      });
      if (existingSchool) {
        Object.assign(existingSchool, dto);
        return await this.schoolRepository.save(existingSchool);
      }
    }

    const school = this.schoolRepository.create({
      ...dto,
      permissions: dto.permissions,
    });
    return await this.schoolRepository.save(school);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  // 카테고리(slug)별 전체 리스트
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
    //.where('school.isActive = :isActive', { isActive: true });

    return await paginate(query, queryBuilder, {
      relations: {
        terms: true,
        statements: true,
        // instructorSchools: true,
      },
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        region: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        // 'category.id': [FilterOperator.IN],
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
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
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
    console.log(`❤️`, JSON.stringify(dto));
    return this.dataSource.transaction(async (manager) => {
      const school = await manager.findOne(School, {
        where: { id },
        relations: ['options'],
      });

      if (!school) {
        throw new NotFoundException(`School with id ${id} not found`);
      }

      return await manager.save(School, school);
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<School> {
    const school = await this.findById(id);
    return await this.schoolRepository.remove(school);
  }

  // note that this is hard-delete
  async deleteImages(url: string): Promise<void> {
    await this.s3Service.delete(url);
  }
}
