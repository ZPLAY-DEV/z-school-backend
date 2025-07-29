import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus, ClassStatus, PickRule } from 'src/common/enums';
import { IPickKeys } from 'src/common/interfaces';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { ResponseCreateOfferingPickDto } from 'src/domain/group/dto/response-create-offering-pick.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { CreateAutoPickDto } from 'src/domain/offering/dto/create-auto-pick.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class OfferingPickService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
  ) {}

  // a note on pretty confusing syntax for MySQL 8.0+
  // https://dev.mysql.com/doc/refman/8.0/en/insert.html#insert-on-duplicate-key-update-values-row
  // 1) INSERT ... VALUES ROW(?, ?, ?, ?, ?, ?)
  // 2) INSERT ... VALUES (?, ?, ?, ?, ?, ?) AS new_pick(studentId, groupId, offeringId, termId, start, end)
  // 3) UPDATE ... JOIN (VALUES ROW(?, ?, ?, ?, ?, ?)) AS new_pick(studentId, groupId, offeringId, termId, start, end ) ON ...
  // 4) UPDATE ... JOIN (VALUES (?, ?, ?, ?, ?, ?)) AS new_pick(studentId, groupId, offeringId, termId, start, end ) ON ...

  //? ---------------------------------------------------------------------- ?//
  //? CREATE (pick 확정짓기)
  //? ---------------------------------------------------------------------- ?//

  async create(offeringId: number): Promise<ResponseCreateOfferingPickDto> {
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

    offering.lesson.groups.forEach((group) => {
      if (!group.schooldays || group.schooldays.length <= 0) {
        throw new BadRequestException('수업일이 없습니다.');
      }
    });

    // console.log('🚀 offering', JSON.stringify(offering, null, 2));
    // offerings 는 같은 학년 group 이 여러개 있을 수 있음
    const sameGradeGroups: { groupId: number; start: string; end: string }[] =
      offering.lesson.groups
        ?.sort(
          (a, b) =>
            a.schooldays[0].startsAt.getTime() -
            b.schooldays[0].startsAt.getTime(),
        )
        .filter((v: Group) => offering.groupIds.includes(v.id))
        .map((v: Group) => {
          const groupId = v.id;
          //const totalDays = v.schooldays.length;
          //const start = formatDateInKST(v.schooldays[0].startsAt);
          //const end = formatDateInKST(v.schooldays[totalDays - 1].endsAt);
          const start = offering.lesson.start;
          const end = offering.lesson.end;
          return { groupId, start, end };
        });

    //console.log('🚀 combo', JSON.stringify(sameGradeGroups, null, 2));

    if (offering.pickRule === PickRule.FIRST) {
      selectedStudentIds = await this.pickFirstComeFirstServed(
        offeringId,
        offering.capacity - offering.prepicked,
        offering.termId,
        sameGradeGroups,
      );
    } else if (offering.pickRule === PickRule.RANDOM) {
      selectedStudentIds = await this.pickRandomStudents(
        offeringId,
        offering.capacity - offering.prepicked,
        offering.termId,
        sameGradeGroups,
      );
    } else {
      selectedStudentIds = await this.pickAnyone(
        offeringId,
        offering.capacity - offering.prepicked,
        offering.termId,
        sameGradeGroups,
      );
    }

    // console.log('🚀 picks', selectedStudentIds);

    return new ResponseCreateOfferingPickDto({
      pickRule: offering.pickRule,
      capacity: offering.capacity,
      filled: selectedStudentIds.length,
      unfilled:
        offering.capacity - selectedStudentIds.length < 0
          ? 0
          : offering.capacity - selectedStudentIds.length,
    });
  }

  async createAutoPicks(dto: CreateAutoPickDto): Promise<number[]> {
    const term = await this.termRepository.findOneOrFail({
      where: { id: dto.termId },
    });
    if (term.bookingEnd && term.bookingEnd > new Date()) {
      throw new BadRequestException('아직 수강신청 종료 전 입니다.');
    }

    const selectedOfferingIds: number[] = [];
    const { schoolId, termId } = dto;

    const offerings = await this.offeringRepository.find({
      where: { schoolId, termId, status: ClassStatus.PENDING },
      relations: ['bookings', 'term'],
    });

    for (const offering of offerings) {
      if (offering.pickRule === PickRule.RANDOM) {
        if (
          offering.bookings.length <=
          offering.capacity - offering.prepicked
        ) {
          selectedOfferingIds.push(offering.id);
          await this.create(offering.id);
        }
      } else {
        selectedOfferingIds.push(offering.id);
        await this.create(offering.id);
      }
    }
    return selectedOfferingIds;
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
    termId: number,
    sameGradeGroups: { groupId: number; start: string; end: string }[],
  ): Promise<number[]> {
    const bookings = await this.bookingRepository.find({
      where: {
        offeringId,
        status: In([BookingStatus.ENROLLED, BookingStatus.PENDING]),
      },
    });
    const allStudentIds = bookings.map((v) => v.studentId);
    // 선착순이므로 정원 내에서만 학생을 선택
    const selectedStudentIds = allStudentIds.slice(0, capacity);

    // 같은 묶음 group 들에는 동일한 학생을 할당 (일주일에 수업이 1번 이상있는 수업은 같은 묶음 group 들이 있음)
    let items: IPickKeys[] = [];
    sameGradeGroups.forEach(({ groupId, start, end }) => {
      const groupItems = selectedStudentIds.map((studentId) => ({
        studentId,
        groupId,
        offeringId,
        termId,
        start,
        end,
      }));
      items = items.concat(groupItems);
    });
    const groupIds = sameGradeGroups.map((v) => v.groupId);

    // 수정까지 고려하여, upsert 되도록 picks 관리: 기존 데이터와 비교하여 사라진 데이터의 경우 삭제처리
    await this.managePicks(
      offeringId,
      groupIds,
      termId,
      selectedStudentIds,
      items,
    );

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
    termId: number,
    sameGradeGroups: { groupId: number; start: string; end: string }[],
  ): Promise<number[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId },
    });
    const allStudentIds = bookings.map((v) => v.studentId);
    // 정원 제한 없이 전체 학생을 모두 선택
    const selectedStudentIds = allStudentIds;

    // 같은 묶음 group 들에는 동일한 학생을 할당 (일주일에 수업이 1번 이상있는 수업은 같은 묶음 group 들이 있음)
    let items: IPickKeys[] = [];
    sameGradeGroups.forEach(({ groupId, start, end }) => {
      const groupItems = selectedStudentIds.map((studentId) => ({
        studentId,
        groupId,
        offeringId,
        termId,
        start,
        end,
      }));
      items = items.concat(groupItems);
    });
    const groupIds = sameGradeGroups.map((v) => v.groupId);

    // 수정까지 고려하여, upsert 되도록 picks 관리: 기존 데이터와 비교하여 사라진 데이터의 경우 삭제처리
    await this.managePicks(
      offeringId,
      groupIds,
      termId,
      selectedStudentIds,
      items,
    );

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
    termId: number,
    sameGradeGroups: { groupId: number; start: string; end: string }[],
  ): Promise<number[]> {
    const bookings = await this.bookingRepository.find({
      where: { offeringId },
    });
    const allStudentIds = bookings.map((v) => v.studentId);
    let selectedStudentIds: number[];
    if (capacity >= allStudentIds.length) {
      selectedStudentIds = allStudentIds;

      // 모든 bookings 의 status 를 ENROLLED 로 변경
      await this.bookingRepository.update(
        { offeringId },
        { status: BookingStatus.ENROLLED },
      );
    } else {
      selectedStudentIds = [...allStudentIds]
        .sort(() => Math.random() - 0.5)
        .slice(0, capacity);

      // 모든 bookings 의 selectedStudentIds 의 status 를 ENROLLED 로 변경
      await this.bookingRepository.update(
        { offeringId, studentId: In(selectedStudentIds) },
        { status: BookingStatus.ENROLLED },
      );

      // 선택되지 않은 나머지 bookings 의 status 를 PENDING 로 변경하고 waitingPosition 설정
      const nonSelectedStudentIds = allStudentIds.filter(
        (id) => !selectedStudentIds.includes(id),
      );

      if (nonSelectedStudentIds.length > 0) {
        // MySQL 8 호환 VALUES ROW 구문 사용
        const valuesRows = nonSelectedStudentIds
          .map(() => `ROW(?, ?, ?)`)
          .join(', ');

        const query = `
          UPDATE bookings 
          JOIN (
            VALUES ${valuesRows}
          ) AS updates(student_id, new_status, new_waiting_position)
          ON bookings.studentId = updates.student_id
          SET 
            bookings.status = updates.new_status,
            bookings.waitingPosition = updates.new_waiting_position
          WHERE bookings.offeringId = ?
        `;

        // 각 학생의 (studentId, status, waitingPosition) 파라미터 구성
        const params = [
          ...nonSelectedStudentIds.flatMap((studentId, index) => [
            studentId,
            BookingStatus.PENDING,
            index + 1,
          ]),
          offeringId,
        ];

        await this.bookingRepository.query(query, params);
      }
    }

    // 같은 묶음 group 들에는 동일한 학생을 할당 (일주일에 수업이 1번 이상있는 수업은 같은 묶음 group 들이 있음)
    let items: IPickKeys[] = [];
    sameGradeGroups.forEach(({ groupId, start, end }) => {
      const groupItems = selectedStudentIds.map((studentId) => ({
        studentId,
        groupId,
        offeringId,
        termId,
        start,
        end,
      }));
      items = items.concat(groupItems);
    });
    const groupIds = sameGradeGroups.map((v) => v.groupId);

    // 수정까지 고려하여, upsert 되도록 picks 관리: 기존 데이터와 비교하여 사라진 데이터의 경우 삭제처리
    await this.managePicks(
      offeringId,
      groupIds,
      termId,
      selectedStudentIds,
      items,
    );

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

  /**
   * 기존 picks와 새로운 선택을 비교하여 lingering dead data 제거
   * - 새로운 picks는 upsert
   * - 선택되지 않은 기존 picks는 삭제
   * - 데이터 정합성 보장 및 불필요한 작업 최소화
   */
  private async managePicks(
    offeringId: number,
    groupIds: number[],
    termId: number,
    selectedStudentIds: number[],
    newItems: IPickKeys[],
  ): Promise<void> {
    // 1. 기존 picks 조회
    const existingPicks = await this.pickRepository.find({
      where: {
        offeringId,
        groupId: In(groupIds),
      },
      select: ['id', 'studentId', 'groupId'],
    });

    // 2. 새로운 picks upsert
    if (newItems.length > 0) {
      const placeholders = newItems.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values = newItems.flatMap((item) => [
        item.studentId,
        item.groupId,
        item.offeringId,
        item.termId,
        item.start,
        item.end,
      ]);

      const query = `
        INSERT INTO picks (studentId, groupId, offeringId, termId, start, end)
        VALUES ${placeholders} AS new_pick(studentId, groupId, offeringId, termId, start, end)
        ON DUPLICATE KEY UPDATE
          termId = new_pick.termId,
          start = new_pick.start,
          end = new_pick.end
      `;
      await this.pickRepository.query(query, values);
    }

    // 3. 선택되지 않은 기존 picks 찾아서 삭제
    const currentSelectedSet = new Set(selectedStudentIds);
    const picksToDelete = existingPicks.filter(
      (pick) => !currentSelectedSet.has(pick.studentId),
    );

    if (picksToDelete.length > 0) {
      const idsToDelete = picksToDelete.map((pick) => pick.id);
      await this.pickRepository.delete({
        id: In(idsToDelete),
      });
    }
  }
}
