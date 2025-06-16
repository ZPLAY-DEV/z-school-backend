import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BookingStatus,
  ClassStatus,
  LimitedPickRule,
  PickRule,
} from 'src/common/enums';
import { IPickKeys } from 'src/common/interfaces';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { ResponsePickDto } from 'src/domain/group/dto/response-pick.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { formatDateInKST } from 'src/helpers/time';
import { In, Repository } from 'typeorm';

@Injectable()
export class OfferingPickService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(offeringId: number): Promise<ResponsePickDto> {
    let selectedStudentIds: number[] = [];

    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: [
        'term', // to get basicPickRule and extraPickRule
        'lesson',
        'lesson.groups',
        'lesson.groups.schooldays',
      ],
    });

    // console.log('🚀 offering', JSON.stringify(offering, null, 2));

    const sameGradeGroups: { groupId: number; startedOn: string }[] =
      offering.lesson.groups
        ?.sort(
          (a, b) =>
            a.schooldays[0].startsAt.getTime() -
            b.schooldays[0].startsAt.getTime(),
        )
        .filter((v: Group) => offering.groupIds.includes(v.id))
        .map((v: Group) => {
          const groupId = v.id;
          const startedOn = formatDateInKST(v.schooldays[0].startsAt);
          return { groupId, startedOn };
        });

    //console.log('🚀 combo', JSON.stringify(sameGradeGroups, null, 2));

    if (offering.pickRule === PickRule.FIRST) {
      selectedStudentIds = await this.pickFirstComeFirstServed(
        offeringId,
        offering.capacity,
        sameGradeGroups,
        offering.term.extraPickRule,
      );
    } else if (offering.pickRule === PickRule.FORMER) {
      selectedStudentIds = await this.pickFormerStudentsFirst(
        offeringId,
        offering.capacity,
        sameGradeGroups,
        offering.term.extraPickRule,
      );
    } else if (offering.pickRule === PickRule.RANDOM) {
      selectedStudentIds = await this.pickRandomStudents(
        offeringId,
        offering.capacity,
        sameGradeGroups,
        offering.term.extraPickRule,
      );
    } else {
      selectedStudentIds = await this.pickAnyone(
        offeringId,
        offering.capacity,
        sameGradeGroups,
        offering.term.extraPickRule,
      );
    }

    // console.log('🚀 picks', selectedStudentIds);

    return new ResponsePickDto({
      pickRule: offering.pickRule,
      capacity: offering.capacity,
      filled: selectedStudentIds.length,
      unfilled:
        offering.capacity - selectedStudentIds.length < 0
          ? 0
          : offering.capacity - selectedStudentIds.length,
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

  // ------------------------------------------------------------------------ //
  // private methods
  // ------------------------------------------------------------------------ //

  async pickFirstComeFirstServed(
    offeringId: number,
    capacity: number,
    sameGradeGroups: { groupId: number; startedOn: string }[],
    extraPickRule: LimitedPickRule,
  ): Promise<number[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId, status: BookingStatus.ENROLLED },
    });
    const allStudentIds = bookings.map((v) => v.studentId);
    // 선착순이므로 정원 내에서만 학생을 선택
    const selectedStudentIds = allStudentIds.slice(0, capacity);
    // 같은 학년 group 들에 동일한 학생을 할당
    let items: IPickKeys[] = [];
    sameGradeGroups.forEach(({ groupId, startedOn }) => {
      const groupItems = selectedStudentIds.map((studentId) => ({
        studentId,
        groupId,
        offeringId,
        startedOn,
      }));
      items = items.concat(groupItems);
    });
    const groupIds = sameGradeGroups.map((v) => v.groupId);
    // raw query로 upsert 처리
    if (items.length > 0) {
      const values = items
        .map(
          (item) =>
            `(${item.studentId},${item.groupId},${item.offeringId},'${item.startedOn}')`,
        )
        .join(',');
      const query = `
        INSERT INTO picks (studentId, groupId, offeringId, startedOn)
        VALUES ${values}
        ON DUPLICATE KEY UPDATE startedOn=VALUES(startedOn)
      `;
      await this.pickRepository.query(query);
    }

    // group 과 lesson 의 상태를 ACTIVE 로 변경
    await this.groupRepository.update(groupIds, { status: ClassStatus.ACTIVE });
    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
    });
    const lessonIds = [
      ...new Set(groups.map((g) => g.lessonId).filter(Boolean)),
    ];
    if (lessonIds.length > 0) {
      await this.lessonRepository.update(lessonIds, {
        status: ClassStatus.ACTIVE,
      });
    }

    return selectedStudentIds;
  }

  async pickAnyone(
    offeringId: number,
    capacity: number,
    sameGradeGroups: { groupId: number; startedOn: string }[],
    extraPickRule: LimitedPickRule,
  ): Promise<number[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId },
    });
    const allStudentIds = bookings.map((v) => v.studentId);
    // 정원 제한 없이 전체 학생을 모두 선택
    const selectedStudentIds = allStudentIds;
    // 같은 학년 group 들에 동일한 학생을 할당
    let items: IPickKeys[] = [];
    sameGradeGroups.forEach(({ groupId, startedOn }) => {
      const groupItems = selectedStudentIds.map((studentId) => ({
        studentId,
        groupId,
        offeringId,
        startedOn,
      }));
      items = items.concat(groupItems);
    });
    const groupIds = sameGradeGroups.map((v) => v.groupId);
    // raw query로 upsert 처리
    if (items.length > 0) {
      const values = items
        .map(
          (item) =>
            `(${item.studentId},${item.groupId},${item.offeringId},'${item.startedOn}')`,
        )
        .join(',');
      const query = `
        INSERT INTO picks (studentId, groupId, offeringId, startedOn)
        VALUES ${values}
        ON DUPLICATE KEY UPDATE startedOn=VALUES(startedOn)
      `;
      await this.pickRepository.query(query);
    }

    // group 과 lesson 의 상태를 ACTIVE 로 변경
    await this.groupRepository.update(groupIds, { status: ClassStatus.ACTIVE });
    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
    });
    const lessonIds = [
      ...new Set(groups.map((g) => g.lessonId).filter(Boolean)),
    ];
    if (lessonIds.length > 0) {
      await this.lessonRepository.update(lessonIds, {
        status: ClassStatus.ACTIVE,
      });
    }

    return selectedStudentIds;
  }

  async pickRandomStudents(
    offeringId: number,
    capacity: number,
    sameGradeGroups: { groupId: number; startedOn: string }[],
    extraPickRule: LimitedPickRule,
  ): Promise<number[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId },
    });
    const allStudentIds = bookings.map((v) => v.studentId);
    let selectedStudentIds: number[];
    if (capacity >= allStudentIds.length) {
      // 1. capacity가 전체 학생 수보다 크거나 같은 경우
      selectedStudentIds = allStudentIds;
    } else {
      // 2. capacity가 전체 학생 수보다 작은 경우
      if (extraPickRule === LimitedPickRule.RANDOM) {
        selectedStudentIds = [...allStudentIds]
          .sort(() => Math.random() - 0.5)
          .slice(0, capacity);
      } else {
        selectedStudentIds = allStudentIds.slice(0, capacity);
      }
    }
    // 같은 학년 group 들에 동일한 학생을 할당
    let items: IPickKeys[] = [];
    sameGradeGroups.forEach(({ groupId, startedOn }) => {
      const groupItems = selectedStudentIds.map((studentId) => ({
        studentId,
        groupId,
        offeringId,
        startedOn,
      }));
      items = items.concat(groupItems);
    });
    const groupIds = sameGradeGroups.map((v) => v.groupId);
    // raw query로 upsert 처리
    if (items.length > 0) {
      const values = items
        .map(
          (item) =>
            `(${item.studentId},${item.groupId},${item.offeringId},'${item.startedOn}')`,
        )
        .join(',');
      const query = `
        INSERT INTO picks (studentId, groupId, offeringId, startedOn)
        VALUES ${values}
        ON DUPLICATE KEY UPDATE startedOn=VALUES(startedOn)
      `;
      await this.pickRepository.query(query);
    }

    // group 과 lesson 의 상태를 ACTIVE 로 변경
    await this.groupRepository.update(groupIds, { status: ClassStatus.ACTIVE });
    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
    });
    const lessonIds = [
      ...new Set(groups.map((g) => g.lessonId).filter(Boolean)),
    ];
    if (lessonIds.length > 0) {
      await this.lessonRepository.update(lessonIds, {
        status: ClassStatus.ACTIVE,
      });
    }

    return selectedStudentIds;
  }

  async pickFormerStudentsFirst(
    offeringId: number,
    capacity: number,
    sameGradeGroups: { groupId: number; startedOn: string }[],
    extraPickRule: LimitedPickRule,
  ): Promise<number[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId },
    });
    const rebookings = bookings.filter((v) => v.isFormerStudent);
    const newbookings = bookings.filter((v) => !v.isFormerStudent);

    let selectedStudentIds: number[] = [];
    if (rebookings.length <= capacity) {
      // 1. rebookings 수가 capacity 이하인 경우
      if (extraPickRule === LimitedPickRule.RANDOM) {
        selectedStudentIds = [
          ...rebookings.map((v) => v.studentId),
          ...newbookings
            .sort(() => Math.random() - 0.5)
            .slice(0, capacity - rebookings.length)
            .map((v) => v.studentId),
        ];
      } else {
        selectedStudentIds = [
          ...rebookings.map((v) => v.studentId),
          ...newbookings
            .slice(0, capacity - rebookings.length)
            .map((v) => v.studentId),
        ];
      }
    } else {
      // 2. rebookings 수가 capacity 초과인 경우
      if (extraPickRule === LimitedPickRule.RANDOM) {
        selectedStudentIds = rebookings
          .sort(() => Math.random() - 0.5)
          .slice(0, capacity)
          .map((v) => v.studentId);
      } else {
        selectedStudentIds = rebookings
          .slice(0, capacity)
          .map((v) => v.studentId);
      }
    }

    // 각 그룹에 동일한 학생을 할당
    let items: IPickKeys[] = [];
    sameGradeGroups.forEach(({ groupId, startedOn }) => {
      const groupItems = selectedStudentIds.map((studentId) => ({
        studentId,
        groupId,
        offeringId,
        startedOn,
      }));
      items = items.concat(groupItems);
    });
    const groupIds = sameGradeGroups.map((v) => v.groupId);
    // raw query로 upsert 처리
    if (items.length > 0) {
      const values = items
        .map(
          (item) =>
            `(${item.studentId},${item.groupId},${item.offeringId},'${item.startedOn}')`,
        )
        .join(',');
      const query = `
        INSERT INTO picks (studentId, groupId, offeringId, startedOn)
        VALUES ${values}
        ON DUPLICATE KEY UPDATE startedOn=VALUES(startedOn)
      `;
      await this.pickRepository.query(query);
    }

    // group 과 lesson 의 상태를 ACTIVE 로 변경
    await this.groupRepository.update(groupIds, { status: ClassStatus.ACTIVE });
    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
    });
    const lessonIds = [
      ...new Set(groups.map((g) => g.lessonId).filter(Boolean)),
    ];
    if (lessonIds.length > 0) {
      await this.lessonRepository.update(lessonIds, {
        status: ClassStatus.ACTIVE,
      });
    }

    return selectedStudentIds;
  }
}
