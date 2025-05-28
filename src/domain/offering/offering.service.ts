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
import { In, Repository } from 'typeorm';

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
      throw new BadRequestException(HttpErrorConstants.NOT_FOUND_ENTITY);
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

  async setFormerStudentIds(
    id: number,
    offeringIds: number[], // 이전학기 수강과목들의 ids
  ): Promise<number[]> {
    // 1. offerings 에서 lessonIds 추출
    const offerings = await this.offeringRepository.find({
      where: { id: In(offeringIds) },
    });

    const lessonIds = offerings
      .map((offering) => offering.lessonId)
      .filter((id) => id !== null && id !== undefined);

    // 2. 이전학기에 이 과목들을 수강한 학생들의 ID를 직접 쿼리로 조회
    const formerStudentIds: number[] = [];

    // 이전 학기 수강생 데이터가 존재한다면 추가
    if (lessonIds.length > 0) {
      const query = `
        SELECT DISTINCT p.studentId
        FROM picks p
        JOIN \`groups\` g ON p.groupId = g.id
        WHERE g.lessonId IN (${lessonIds.join(',')})
        AND p.deletedAt IS NULL
      `;

      const studentIdsResult = await this.offeringRepository.query(query);

      studentIdsResult.forEach((result: { studentId: number }) => {
        if (result.studentId) {
          formerStudentIds.push(result.studentId);
        }
      });
    }

    // 현재 offering에 이전 수강생 ID 배열 저장
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id },
    });
    const studentIds = [...new Set(formerStudentIds)];
    offering.formerStudentIds = studentIds;
    await this.offeringRepository.save(offering);
    return studentIds;
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
}
