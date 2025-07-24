import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { ClassStatus, PickRule } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

//? 학교 수강신청 리스트 페이지에서 보여주는 아이템.
//? - 수강신청기간에만 valid 한 entries 이 들어 있으면 되므로 학기 정보는 필요없음.

@Entity('offerings')
@Index(['schoolId', 'termId'])
@Unique(['schoolId', 'termId', 'lessonId', 'groupName'])
export class Offering {
  @ApiProperty({ description: 'offeringId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 학교ID' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  schoolId: number | null;

  @ApiProperty({ description: '🈵 학기ID' })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  @ApiProperty({ description: '🈵 과목ID' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  lessonId: number | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '학교명' })
  @Column({ type: 'varchar', length: 24 })
  schoolName: string;

  @ApiProperty({ description: '과목이름' })
  @Column({ type: 'varchar', length: 24 })
  lessonName: string;

  @ApiProperty({ description: '반이름' })
  @Column({ type: 'varchar', length: 32 })
  groupName: string;

  @ApiProperty({ description: '🈵 강사이름', example: '홍길동' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  samName: string | null;

  @ApiProperty({ description: 'class size' })
  @Column({ type: 'tinyint', unsigned: true, default: 20 })
  capacity: number;

  @ApiProperty({ description: 'bookings size' })
  @Column({ type: 'smallint', unsigned: true, default: 0 })
  bookingCount: number;

  @ApiProperty({ description: '🈳 prepicked size' })
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  prepicked: number;

  @ApiProperty({
    description: '수강가능한 학년들 (배열)',
    type: 'array',
    isArray: true,
  })
  @Column('simple-array')
  allowedGrades: number[];

  @ApiProperty({
    description: '수강신청 규칙 (enum)',
    enum: PickRule,
  })
  @Column({
    type: 'enum',
    enum: PickRule,
    default: PickRule.FIRST,
  })
  pickRule: PickRule;

  @ApiProperty({
    description: '수업 시간 정보 (could be multiple)',
    type: 'array',
    isArray: true,
  })
  @Column({ type: 'json', comment: '수업 시간 정보 (could be multiple)' })
  times: ITimeRange[];

  @ApiProperty({
    description: 'bitmasks (수업시간 겹치는지 판단하기 위한 자료)',
    type: 'array',
    isArray: true,
  })
  @Column('simple-array')
  bitmasks: number[];

  @ApiProperty({
    description:
      '수강신청과목에 포함된 반 Ids (예. 체육A 는 월요일반과 수요일반 수업으로 구성)',
    type: 'array',
    isArray: true,
  })
  @Column('simple-array')
  groupIds: number[];

  @ApiProperty({
    description: '지난 학기에 수강한 학생 Ids',
    type: 'array',
    isArray: true,
  })
  @Column('simple-array')
  prepickedStudentIds: number[];

  @ApiProperty({
    description:
      '해당 수강신청과목 취소하면, full sync 가 이뤄지는데, 이를 처리하는데 필요한 version 정보를 저장',
    type: 'number',
  })
  @Column({
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment:
      '해당 수강신청과목 취소하면, full sync 가 이뤄지는데, 이를 처리하는데 필요한 version 정보',
  })
  lastSyncTimestamp: number;

  @ApiProperty({ description: '🈵 상태' })
  @Column({
    type: 'enum',
    enum: ClassStatus,
    default: ClassStatus.PENDING,
  })
  status: ClassStatus;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school) => school.offerings)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @ManyToOne(() => Term, (term) => term.offerings)
  @JoinColumn({ name: 'termId' })
  term: Term;

  @ManyToOne(() => Lesson, (lesson) => lesson.offerings)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Booking, (booking) => booking.offering)
  bookings: Booking[];

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Pick, (pick) => pick.offering)
  picks: Pick[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Offering>) {
    Object.assign(this, partial);
  }

  @AfterLoad()
  convertSimpleArraysToNumbers() {
    if (this.allowedGrades) this.allowedGrades = this.allowedGrades.map(Number);
    if (this.bitmasks) this.bitmasks = this.bitmasks.map(Number);
    if (this.groupIds) this.groupIds = this.groupIds.map(Number);
    if (this.prepickedStudentIds)
      this.prepickedStudentIds = this.prepickedStudentIds.map(Number);
  }
}
