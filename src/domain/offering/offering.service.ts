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
import { Repository } from 'typeorm';

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

  async updateFormerStudentIds(id: number): Promise<Offering> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id },
    });

    if (!offering?.schoolId) {
      throw new BadRequestException('School ID is required');
    }

    const school = await this.schoolRepository.findOneOrFail({
      where: { id: offering.schoolId },
      relations: ['terms'],
    });

    if (school.terms.length < 2) {
      throw new BadRequestException(HttpErrorConstants.CONDITION_NOT_MET);
    }

    const { term } = offering;
    if (!term || !term.school || !term.school.terms) {
      return offering; // No changes if no related data found
    }

    // Find the direct previous term based on dates
    // Sort terms by end date in descending order
    const sortedTerms = [...term.school.terms]
      .filter((t) => t.id !== term.id) // Exclude current term
      .sort((a, b) => {
        const aEndDate = new Date(a.end);
        const bEndDate = new Date(b.end);
        return bEndDate.getTime() - aEndDate.getTime(); // Descending
      });

    // Find the term that ends most recently before the current term starts
    const currentTermStart = new Date(term.start);
    const previousTerm = sortedTerms.find((t) => {
      const termEndDate = new Date(t.end);
      return termEndDate < currentTermStart;
    });

    if (previousTerm) {
      // Find all offerings from the previous term that match the current offering's criteria
      const previousOfferings = await this.offeringRepository.find({
        where: {
          termId: previousTerm.id,
          lessonName: offering.lessonName, // Match by lesson name
        },
      });

      if (previousOfferings.length > 0) {
        // Collect all student IDs from the previous term's matching offerings
        const formerStudentIds: number[] = [];

        // Extract student IDs from all previous offerings
        previousOfferings.forEach((prevOffering) => {
          if (
            prevOffering.formerStudentIds &&
            prevOffering.formerStudentIds.length > 0
          ) {
            // Add IDs that aren't already in our list
            prevOffering.formerStudentIds.forEach((id) => {
              if (!formerStudentIds.includes(id)) {
                formerStudentIds.push(id);
              }
            });
          }
        });

        // Update offering with former student IDs
        offering.formerStudentIds = offering.formerStudentIds || [];
        offering.formerStudentIds = formerStudentIds;
        console.log(
          `Updated formerStudentIds with ${formerStudentIds.length} students from previous term ${previousTerm.termName}`,
        );
      } else {
        console.log(
          `No matching offerings found in previous term ${previousTerm.termName}`,
        );
      }
    } else {
      console.log('No previous term found');
    }

    return await this.offeringRepository.save(offering);
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
