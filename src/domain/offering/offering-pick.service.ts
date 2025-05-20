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

interface IPickKeys {
  studentId: number;
  groupId: number;
  offeringId: number;
}

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

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(offeringId: number): Promise<ResponsePickDto> {
    let picks: Pick[] = [];

    const { groupIds, enrollmentRule, capacity } =
      await this.offeringRepository.findOneOrFail({
        where: { id: offeringId },
      });

    if (enrollmentRule === EnrollmentRule.FIRST) {
      picks = await this.pickFirstComeFirstServed(
        offeringId,
        capacity,
        groupIds,
      );
    } else if (enrollmentRule === EnrollmentRule.PREVIOUS) {
      picks = await this.pickRandomStudents(offeringId, capacity, groupIds);
    } else if (enrollmentRule === EnrollmentRule.RANDOM) {
      picks = await this.pickRandomStudents(offeringId, capacity, groupIds);
    } else {
      picks = await this.pickAnyone(offeringId, capacity, groupIds);
    }

    //! we still need
    //! - to save vacancy somewhere
    //! - lesson.status = ACTIVE
    //! - group.status = ACTIVE

    return new ResponsePickDto({
      enrollmentRule: enrollmentRule,
      offeringCapacity: capacity,
      studentsEnrolled: picks.length,
      availableSlots: capacity - picks.length < 0 ? 0 : capacity - picks.length,
    });
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

  async pickFirstComeFirstServed(
    offeringId: number,
    capacity: number,
    groupIds: number[],
  ): Promise<Pick[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    let items: IPickKeys[] = [];
    groupIds.forEach((groupId: number) => {
      const groupItems = bookings.map((v) => ({
        studentId: v.studentId,
        groupId,
        offeringId,
      }));
      items = items.concat(groupItems);
    });
    return this.pickRepository.save(items);
  }

  async pickAnyone(
    offeringId: number,
    capacity: number,
    groupIds: number[],
  ): Promise<Pick[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    let items: IPickKeys[] = [];
    groupIds.forEach((groupId: number) => {
      const groupItems = bookings.map((v) => ({
        studentId: v.studentId,
        groupId,
        offeringId,
      }));
      items = items.concat(groupItems);
    });
    return this.pickRepository.save(items);
  }

  async pickRandomStudents(
    offeringId: number,
    capacity: number,
    groupIds: number[],
  ): Promise<Pick[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId },
    });
    let items: IPickKeys[] = [];
    groupIds.forEach((groupId: number) => {
      const groupItems = bookings.map((v) => ({
        studentId: v.studentId,
        groupId,
        offeringId,
      }));
      if (capacity >= groupItems.length) {
        // 정원 이하면, 모두 저장
        items = items.concat(groupItems);
      } else {
        // 정원 초과면, 랜덤하게 capacity만큼 뽑아서 저장
        const shuffled = groupItems.sort(() => Math.random() - 0.5);
        items = items.concat(shuffled.slice(0, capacity));
      }
    });
    return this.pickRepository.save(items);
  }

  async pickFormerStudentsFirst(
    offeringId: number,
    capacity: number,
    groupIds: number[],
  ): Promise<Pick[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId },
    });
    const rebookings = bookings.filter((v) => v.isFormerStudent);
    const newbookings = bookings.filter((v) => !v.isFormerStudent);

    let items: IPickKeys[] = [];
    groupIds.forEach((groupId: number) => {
      let selected: typeof bookings = [];
      if (rebookings.length <= capacity) {
        // 1. rebookings 모두 저장
        selected = [...rebookings];
        // 남은 자리에 newbookings에서 순차적으로 채움
        if (capacity - rebookings.length > 0) {
          selected = selected.concat(
            newbookings.slice(0, capacity - rebookings.length),
          );
        }
      } else {
        // 2. rebookings 수가 capacity 초과면 rebookings에서만 랜덤하게 capacity만큼 뽑음
        const shuffledRe = [...rebookings].sort(() => Math.random() - 0.5);
        selected = shuffledRe.slice(0, capacity);
      }
      const groupItems = selected.map((v) => ({
        studentId: v.studentId,
        groupId,
        offeringId,
      }));
      items = items.concat(groupItems);
    });
    return this.pickRepository.save(items);
  }
}
