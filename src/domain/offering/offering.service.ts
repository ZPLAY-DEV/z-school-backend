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
import { EntityNotFoundError, Repository } from 'typeorm';

@Injectable()
export class OfferingService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateOfferingDto): Promise<Offering> {
    const item = this.offeringRepository.create(dto);
    return await this.offeringRepository.save(item);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

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

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateOfferingDto): Promise<Offering> {
    const offering = await this.offeringRepository.preload({ id, ...dto });
    if (!offering) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
    return await this.offeringRepository.save(offering);
  }

  async updateFormerStudentIds(
    id: number,
    lessonName: string,
  ): Promise<number> {
    const formerStudentIds: number[] = [];
    try {
      const previousTermId = await this.findImmediatelyPreviousTermId(id);
      const offerings = await this.offeringRepository.find({
        where: { termId: previousTermId, lessonName },
      });

      if (!offerings || offerings.length === 0) {
        throw new Error('no offerings');
      }
      // dedupe lessonIds
      const lessonIds = [
        ...new Set(offerings.map((offering) => offering.lessonId)),
      ];
      const query = `
        SELECT DISTINCT p.studentId
        FROM picks p
        JOIN \`groups\` g ON p.groupId = g.id
        WHERE g.lessonId IN (${lessonIds.join(',')})
        AND p.deletedAt IS NULL
      `;

      const rows = await this.offeringRepository.query(query);
      rows.forEach((result: { studentId: number }) => {
        if (result.studentId) {
          formerStudentIds.push(result.studentId);
        }
      });

      const offering = await this.offeringRepository.findOneOrFail({
        where: { id },
      });

      const studentIds = [...new Set(formerStudentIds)];
      offering.formerStudentIds = studentIds;
      await this.offeringRepository.save(offering);

      return studentIds.length;
    } catch (error) {
      if (error instanceof EntityNotFoundError || error instanceof Error) {
        throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
      }
      throw new BadRequestException(HttpErrorConstants.DATABASE_QUERY_ERROR);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async softRemove(id: number): Promise<Offering> {
    const offering = await this.findById(id);
    return await this.offeringRepository.softRemove(offering);
  }

  async hardRemove(id: number): Promise<Offering> {
    const offering = await this.findById(id);
    return await this.offeringRepository.remove(offering);
  }

  // ------------------------------------------------------------------------ //
  // private methods
  // ------------------------------------------------------------------------ //

  async findImmediatelyPreviousTermId(offeringId: number): Promise<number> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['term', 'term.school', 'term.school.terms'],
    });

    const { term } = offering;
    if (!term || !term.school || !term.school.terms) {
      throw new Error(`no term`);
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
      throw new Error(`no term`);
    }
  }
}
