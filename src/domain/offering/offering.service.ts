import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { S3Service } from 'src/services/aws/s3.service';
import { Repository } from 'typeorm';

@Injectable()
export class OfferingService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    private readonly s3Service: S3Service,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  async create(dto: CreateOfferingDto): Promise<Offering> {
    const item = this.offeringRepository.create(dto);
    return await this.offeringRepository.save(item);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  async findAll(query: PaginateQuery): Promise<Paginated<Offering>> {
    const queryBuilder = this.offeringRepository.createQueryBuilder('offering');
    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'schoolName', 'lessonName', 'groupName'],
      searchableColumns: ['schoolName', 'lessonName', 'groupName'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        isActive: [FilterOperator.EQ],
        offeringType: [FilterOperator.EQ],
      },
    });
  }

  async findBySchoolId(schoolId: number): Promise<Offering[]> {
    return await this.offeringRepository
      .createQueryBuilder('offering')
      .orderBy('offering.id', 'DESC')
      .where({ schoolId })
      .getMany();
  }

  async findById(id: number, relations: string[] = []): Promise<Offering> {
    try {
      return relations.length > 0
        ? await this.offeringRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.offeringRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException('entity not found');
    }
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  async update(id: number, dto: UpdateOfferingDto): Promise<Offering> {
    const offering = await this.offeringRepository.preload({ id, ...dto });
    if (!offering) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.offeringRepository.save(offering);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  // note that this is hard-delete
  async remove(id: number): Promise<Offering> {
    const offering = await this.findById(id);
    return await this.offeringRepository.remove(offering);
  }
}
