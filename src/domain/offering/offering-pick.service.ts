import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus, ClassStatus, PickRule } from 'src/common/enums';
import { IPickKeys } from 'src/common/interfaces';
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
  //? CREATE (pick 확정짓기)
  //? ---------------------------------------------------------------------- ?//

  async create(offeringId: number): Promise<ResponsePickDto> {
    let selectedStudentIds: number[] = [];

    const offering = await this.offeringRepository.findOneOrFail({
      where: { id: offeringId },
      relations: [
        'term', // to get PickRule
        'lesson',
        'lesson.groups',
        'lesson.groups.schooldays',
      ],
    });

    // console.log('🚀 offering', JSON.stringify(offering, null, 2));
    // offerings 는 같은 학년 group 이 여러개 있을 수 있음
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
        offering.capacity - offering.prepicked,
        sameGradeGroups,
      );
    } else if (offering.pickRule === PickRule.RANDOM) {
      selectedStudentIds = await this.pickRandomStudents(
        offeringId,
        offering.capacity - offering.prepicked,
        sameGradeGroups,
      );
    } else {
      selectedStudentIds = await this.pickAnyone(
        offeringId,
        offering.capacity - offering.prepicked,
        sameGradeGroups,
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
      throw new NotFoundException(`Offering not found`);
    }
  }

  // ------------------------------------------------------------------------ //
  // private methods
  // ------------------------------------------------------------------------ //

  async pickFirstComeFirstServed(
    offeringId: number,
    capacity: number,
    sameGradeGroups: { groupId: number; startedOn: string }[],
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

    // raw query로 upsert 처리 (MySQL 8.0+ alias 문법 사용)
    if (items.length > 0) {
      const placeholders = items.map(() => '(?, ?, ?, ?)').join(', ');
      const values = items.flatMap((item) => [
        item.studentId,
        item.groupId,
        item.offeringId,
        item.startedOn,
      ]);

      const query = `
        INSERT INTO picks (studentId, groupId, offeringId, startedOn)
        VALUES ${placeholders} AS new_pick(studentId, groupId, offeringId, startedOn)
        ON DUPLICATE KEY UPDATE 
          startedOn = new_pick.startedOn
      `;
      await this.pickRepository.query(query, values);
    }

    // set offering, groups, lesson 의 상태를 ACTIVE 로 변경
    await this.offeringRepository.update(offeringId, {
      status: ClassStatus.ACTIVE,
    });
    await this.groupRepository.update(groupIds, { status: ClassStatus.ACTIVE });
    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
    });
    if (groups.length > 0) {
      await this.lessonRepository.update(groups[0].lessonId, {
        status: ClassStatus.ACTIVE,
      });
    }

    return selectedStudentIds;
  }

  async pickAnyone(
    offeringId: number,
    capacity: number,
    sameGradeGroups: { groupId: number; startedOn: string }[],
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

    // raw query로 upsert 처리 (MySQL 8.0+ alias 문법 사용)
    if (items.length > 0) {
      const placeholders = items.map(() => '(?, ?, ?, ?)').join(', ');
      const values = items.flatMap((item) => [
        item.studentId,
        item.groupId,
        item.offeringId,
        item.startedOn,
      ]);

      const query = `
        INSERT INTO picks (studentId, groupId, offeringId, startedOn)
        VALUES ${placeholders} AS new_pick(studentId, groupId, offeringId, startedOn)
        ON DUPLICATE KEY UPDATE 
          startedOn = new_pick.startedOn
      `;
      await this.pickRepository.query(query, values);
    }

    // set offering, groups, lesson 의 상태를 ACTIVE 로 변경
    await this.offeringRepository.update(offeringId, {
      status: ClassStatus.ACTIVE,
    });
    await this.groupRepository.update(groupIds, { status: ClassStatus.ACTIVE });
    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
    });
    if (groups.length > 0) {
      await this.lessonRepository.update(groups[0].lessonId, {
        status: ClassStatus.ACTIVE,
      });
    }

    return selectedStudentIds;
  }

  async pickRandomStudents(
    offeringId: number,
    capacity: number,
    sameGradeGroups: { groupId: number; startedOn: string }[],
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
      selectedStudentIds = [...allStudentIds]
        .sort(() => Math.random() - 0.5)
        .slice(0, capacity);
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

    // raw query로 upsert 처리 (MySQL 8.0+ alias 문법 사용)
    if (items.length > 0) {
      const placeholders = items.map(() => '(?, ?, ?, ?)').join(', ');
      const values = items.flatMap((item) => [
        item.studentId,
        item.groupId,
        item.offeringId,
        item.startedOn,
      ]);

      const query = `
        INSERT INTO picks (studentId, groupId, offeringId, startedOn)
        VALUES ${placeholders} AS new_pick(studentId, groupId, offeringId, startedOn)
        ON DUPLICATE KEY UPDATE 
          startedOn = new_pick.startedOn
      `;
      await this.pickRepository.query(query, values);
    }

    // todo. 죽은 데이터가 삭제되는지 확인.

    // set offering, groups, lesson 의 상태를 ACTIVE 로 변경
    await this.offeringRepository.update(offeringId, {
      status: ClassStatus.ACTIVE,
    });
    await this.groupRepository.update(groupIds, { status: ClassStatus.ACTIVE });
    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
    });
    if (groups.length > 0) {
      await this.lessonRepository.update(groups[0].lessonId, {
        status: ClassStatus.ACTIVE,
      });
    }

    return selectedStudentIds;
  }
}
