import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus, EnrollmentRule } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { ResponsePickDto } from 'src/domain/group/dto/response-pick.dto';
import { Pick } from 'src/domain/group/entities/pick.entity';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OfferingPickService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  async pickFirstComeFirstServed(offeringId: number): Promise<Pick[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['lesson', 'lesson.groups'],
    });
    const groupIds = offering.lesson.groups.map((v) => v.id);
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const createPickDtos = groupIds.flatMap((groupId: number) => {
      return bookings.map((v) => {
        return {
          studentId: v.studentId,
          groupId,
          offeringId,
        };
      });
    });
    return this.pickRepository.save(createPickDtos);
  }

  async pickRandomStudents(offeringId: number): Promise<Pick[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['lesson', 'lesson.groups'],
    });
    const groupIds = offering.lesson.groups.map((v) => v.id);
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const createPickDtos = groupIds.flatMap((groupId: number) => {
      return bookings.map((v) => {
        return {
          studentId: v.studentId,
          groupId,
        };
      });
    });
    return this.pickRepository.save(createPickDtos);
  }

  async pickFormerStudentsFirst(offeringId: number): Promise<Pick[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['lesson', 'lesson.groups'],
    });
    const groupIds = offering.lesson.groups.map((v) => v.id);
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const createPickDtos = groupIds.flatMap((groupId: number) => {
      return bookings.map((v) => {
        return {
          studentId: v.studentId,
          groupId,
        };
      });
    });
    return this.pickRepository.save(createPickDtos);
  }

  async pickAnyone(offeringId: number): Promise<Pick[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['lesson', 'lesson.groups'],
    });
    const groupIds = offering.lesson.groups.map((v) => v.id);
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const createPickDtos = groupIds.flatMap((groupId: number) => {
      return bookings.map((v) => {
        return {
          studentId: v.studentId,
          groupId,
          offeringId,
        };
      });
    });
    return this.pickRepository.save(createPickDtos);
  }

  async create(offeringId: number, dto: any): Promise<ResponsePickDto> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
    });

    let picks: Pick[] = [];

    console.log(`🟠`, offering.enrollmentRule);

    switch (offering.enrollmentRule) {
      case EnrollmentRule.FIRST:
        picks = await this.pickFirstComeFirstServed(offeringId);
        break;
      case EnrollmentRule.PREVIOUS:
        picks = await this.pickFormerStudentsFirst(offeringId);
        break;
      case EnrollmentRule.RANDOM:
        picks = await this.pickRandomStudents(offeringId);
        break;
      default:
        // EnrollmentRule.ANYONE
        picks = await this.pickAnyone(offeringId);
    }

    return new ResponsePickDto({
      enrollmentRule: offering.enrollmentRule,
      offeringCapacity: offering.capacity,
      studentsEnrolled: picks.length,
      availableSlots:
        offering.capacity - picks.length < 0
          ? 0
          : offering.capacity - picks.length,
    });
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
