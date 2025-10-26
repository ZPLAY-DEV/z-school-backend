import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus, TermType } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class OfferingService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
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
      throw new NotFoundException(`Offering not found`);
    }
  }

  async findBookings(offeringId: number): Promise<Booking[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['bookings', 'bookings.student', 'bookings.student.parent'],
    });

    const students = await this.studentRepository.find({
      where: { id: In(offering.prepickedStudentIds) },
      relations: ['parent'],
    });

    const prepickedBookings = students.map((student) => {
      return {
        id: 0,
        offeringId: offering.id,
        studentId: student.id,
        lessonName: offering.lessonName,
        waitingPosition: 0,
        status: BookingStatus.ENROLLED,
        note: '재수강학생',
        student,
        createdAt: new Date(),
        updatedAt: new Date(),
        offering,
      } as Booking;
    });

    return [...prepickedBookings, ...offering.bookings];
  }

  // async findPrepickedStudents(offeringId: number): Promise<Student[]> {
  //   const offering = await this.offeringRepository.findOneOrFail({
  //     where: { id: offeringId },
  //   });

  //   return await this.studentRepository.find({
  //     where: { id: In(offering.prepickedStudentIds) },
  //     relations: ['parent'],
  //   });
  // }

  async findFormerStudents(offeringId: number): Promise<Student[]> {
    try {
      const { termId, lessonName } =
        await this.findLessonNameAndPreviousTermId(offeringId);
      const offerings = await this.offeringRepository.find({
        where: { termId, lessonName },
      });

      const picks = await this.pickRepository.find({
        where: { offeringId: In(offerings.map((offering) => offering.id)) },
        relations: ['student'],
      });

      // id 중복 제거
      const uniqueStudentsMap = new Map<number, Student>();
      picks.forEach((pick) => {
        if (pick.student && pick.student.id) {
          uniqueStudentsMap.set(pick.student.id, pick.student);
        }
      });

      return Array.from(uniqueStudentsMap.values());
    } catch (error) {
      console.error(error);
      throw new NotFoundException(error.message || `Offering not found`);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateOfferingDto): Promise<Offering> {
    const offering = await this.offeringRepository.preload({ id, ...dto });
    if (!offering) {
      throw new NotFoundException(`Offering not found`);
    }
    return await this.offeringRepository.save(offering);
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

  async findLessonNameAndPreviousTermId(offeringId: number): Promise<{
    termId: number;
    lessonName: string;
  }> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['term', 'term.school', 'term.school.terms'],
    });

    const { term } = offering;
    if (!term || !term.school || !term.school.terms) {
      throw new Error(`Offering corrupted`);
    }

    // Find the direct previous term based on dates
    // Sort terms by start date in descending order
    const sortedTerms = [...term.school.terms]
      .filter((t) => t.id !== term.id) // Exclude current term
      .filter((t) => t.type === TermType.REGULAR) // Exclude current term
      .sort((a, b) => {
        const aStartDate = new Date(a.start);
        const bStartDate = new Date(b.start);
        return bStartDate.getTime() - aStartDate.getTime(); // Descending
      });
    const previousTerm = sortedTerms[0];

    if (previousTerm) {
      return {
        termId: previousTerm.id,
        lessonName: offering.lessonName,
      };
    } else {
      throw new Error(`No previous term found`);
    }
  }
}
