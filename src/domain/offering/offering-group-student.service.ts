import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus, EnrollmentRule } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { ResponsePickDto } from 'src/domain/group/dto/response-pick.dto';
import { GroupStudent } from 'src/domain/group/entities/group-student.entity';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OfferingGroupStudentService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(GroupStudent)
    private readonly groupStudentRepository: Repository<GroupStudent>,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  async pickFirstComeFirstServed(offeringId: number): Promise<GroupStudent[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['lesson', 'lesson.groups'],
    });
    const groupIds = offering.lesson.groups.map((v) => v.id);
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const createGroupStudentDtos = groupIds.flatMap((groupId: number) => {
      return bookings.map((v) => {
        return {
          studentId: v.studentId,
          groupId,
        };
      });
    });
    return this.groupStudentRepository.save(createGroupStudentDtos);
  }

  async pickRandomStudents(offeringId: number): Promise<GroupStudent[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['lesson', 'lesson.groups'],
    });
    const groupIds = offering.lesson.groups.map((v) => v.id);
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const createGroupStudentDtos = groupIds.flatMap((groupId: number) => {
      return bookings.map((v) => {
        return {
          studentId: v.studentId,
          groupId,
        };
      });
    });
    return this.groupStudentRepository.save(createGroupStudentDtos);
  }

  async pickFormerStudentsFirst(offeringId: number): Promise<GroupStudent[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['lesson', 'lesson.groups'],
    });
    const groupIds = offering.lesson.groups.map((v) => v.id);
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const createGroupStudentDtos = groupIds.flatMap((groupId: number) => {
      return bookings.map((v) => {
        return {
          studentId: v.studentId,
          groupId,
        };
      });
    });
    return this.groupStudentRepository.save(createGroupStudentDtos);
  }

  async pickAnyone(offeringId: number): Promise<GroupStudent[]> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: ['lesson', 'lesson.groups'],
    });
    const groupIds = offering.lesson.groups.map((v) => v.id);
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const createGroupStudentDtos = groupIds.flatMap((groupId: number) => {
      return bookings.map((v) => {
        return {
          studentId: v.studentId,
          groupId,
        };
      });
    });
    return this.groupStudentRepository.save(createGroupStudentDtos);
  }

  async create(offeringId: number, dto: any): Promise<ResponsePickDto> {
    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: dto.offeringId },
    });

    let groupStudents: GroupStudent[] = [];

    switch (offering.enrollmentRule) {
      case EnrollmentRule.FIRST:
        groupStudents = await this.pickFirstComeFirstServed(offeringId);
        break;
      case EnrollmentRule.PREVIOUS:
        groupStudents = await this.pickFormerStudentsFirst(offeringId);
        break;
      case EnrollmentRule.RANDOM:
        groupStudents = await this.pickRandomStudents(offeringId);
        break;
      default:
        // EnrollmentRule.ANYONE
        groupStudents = await this.pickAnyone(offeringId);
    }

    const studentsEnrolled = groupStudents.length;
    const availableSlots = offering.lesson.groups.length - studentsEnrolled;

    return new ResponsePickDto({
      enrollmentRule: offering.enrollmentRule,
      classCapacity: offering.lesson.groups.length,
      studentsEnrolled,
      availableSlots,
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
