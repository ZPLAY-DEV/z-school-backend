import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class OfferingService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
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
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  async findImmediatelyPreviousTermId(offeringId: number): Promise<number> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['term', 'term.school', 'term.school.terms'],
    });

    const { term } = offering;
    if (!term || !term.school || !term.school.terms) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }

    // Find the direct previous term based on dates
    // Sort terms by start date in descending order
    const sortedTerms = [...term.school.terms]
      .filter((t) => t.id !== term.id) // Exclude current term
      .sort((a, b) => {
        const aStartDate = new Date(a.start);
        const bStartDate = new Date(b.start);
        return bStartDate.getTime() - aStartDate.getTime(); // Descending
      });

    // Find the term that starts most recently before the current term starts
    const currentTermStart = new Date(term.start);
    const previousTerm = sortedTerms.find((t) => {
      const termStartDate = new Date(t.start);
      return termStartDate < currentTermStart;
    });

    if (previousTerm) {
      return previousTerm.id;
    } else {
      throw new BadRequestException(HttpErrorConstants.CONDITION_NOT_MET);
    }
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  async update(id: number, dto: UpdateOfferingDto): Promise<Offering> {
    const offering = await this.offeringRepository.preload({ id, ...dto });
    if (!offering) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
    return await this.offeringRepository.save(offering);
  }

  async resetFormerStudentIds(
    id: number,
    offeringIds: number[],
  ): Promise<void> {
    const offerings = await this.offeringRepository.find({
      where: { id: In(offeringIds) },
    });

    offerings.forEach((offering) => {
      offering.formerStudentIds = [];
    });

    await this.offeringRepository.save(offerings);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  async softRemove(id: number): Promise<Offering> {
    const offering = await this.findById(id);
    return await this.offeringRepository.softRemove(offering);
  }

  async hardRemove(id: number): Promise<Offering> {
    const offering = await this.findById(id);
    return await this.offeringRepository.remove(offering);
  }
}
