import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { StudentStatus } from 'src/common/enums';
import { IDailyEscortInfo } from 'src/common/interfaces';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Ledger } from 'src/domain/ledger/entities/ledger.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Subsidy } from 'src/domain/subsidy/entities/subsidy.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('students')
@Unique(['schoolId', 'grade', 'class', 'studentCode'])
export class Student {
  @ApiProperty({ description: 'studentId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: 'exclusively exists in parent', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  parentId: number;

  @ApiProperty({ description: 'exclusively exists in school', example: 1 })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '학년', example: 1 })
  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  grade: number;

  @ApiProperty({
    description: '반',
    example: '1반',
  })
  @Column({
    type: 'varchar',
    length: 8,
    comment: '반은 다양한 형태로 생성될 수 있음 (1반, 2반, 기쁨반 ..)',
  })
  class: string;

  @ApiProperty({ description: '학번/번호', example: 10 })
  @Column({
    type: 'tinyint',
    unsigned: true,
    comment: '학번/번호',
  })
  studentCode: number;

  @ApiProperty({ description: 'up to 16 characters' })
  @Column({ type: 'varchar', length: 16, comment: '이름' })
  name: string;

  @ApiProperty({
    description: '학생 전화번호 (숫자만 입력)',
    example: '01012345678',
  })
  @Column({ type: 'varchar', length: 16, nullable: true, comment: '학생번호' })
  phone: string | null;

  @ApiProperty({ description: '학생의 상태. 유효, 전학', example: 'ATTENDING' })
  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ATTENDING,
  })
  status: StudentStatus;

  @ApiProperty({
    description: '대표. 보호자 전화번호 (숫자만 입력)',
    example: '01012345678',
  })
  @Column({ type: 'varchar', length: 16, nullable: true })
  escortPhone: string | null;

  @ApiProperty({ description: '대표. 하교후 목적지', example: '독서실' })
  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '하교후 목적지',
  })
  nextStop: string | null;

  @ApiProperty({
    description: '월요일 보호자 정보',
    example: { phone: '01012345678', nextStop: '노래방' },
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '월요일 보호자 전화번호 및 하교 목적지',
  })
  monday: IDailyEscortInfo | null;

  @ApiProperty({
    description: '화요일 보호자 정보',
    example: { phone: '01012345678', nextStop: '피씨방' },
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '화요일 보호자 전화번호 및 하교 목적지',
  })
  tuesday: IDailyEscortInfo | null;

  @ApiProperty({
    description: '수요일 보호자 정보',
    example: { phone: '01012345678', nextStop: '풀스방' },
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '수요일 보호자 전화번호 및 하교 목적지',
  })
  wednesday: IDailyEscortInfo | null;

  @ApiProperty({
    description: '목요일 보호자 정보',
    example: { phone: '01012345678', nextStop: '비디오방' },
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '목요일 보호자 전화번호 및 하교 목적지',
  })
  thursday: IDailyEscortInfo | null;

  @ApiProperty({
    description: '금요일 보호자 정보',
    example: { phone: '01012345678', nextStop: '공부방' },
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '금요일 보호자 전화번호 및 하교 목적지',
  })
  friday: IDailyEscortInfo | null;

  @ApiProperty({
    description: '토요일 보호자 정보',
    example: { phone: '01012345678', nextStop: '오락실' },
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '토요일 보호자 전화번호 및 하교 목적지',
  })
  saturday: IDailyEscortInfo | null;

  @ApiProperty({ description: '🈳 비고', example: '비고내용' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

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

  @ManyToOne(() => Parent, (parent) => parent.students)
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @ManyToOne(() => School, (school) => school.students)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Booking, (booking) => booking.student)
  bookings: Booking[]; // 수강신청

  @OneToMany(() => Subsidy, (subsidy) => subsidy.student)
  subsidies: Subsidy[]; // 학생지원금

  @OneToMany(() => Ledger, (ledger) => ledger.student)
  ledgers: Ledger[]; // 영수증

  @OneToMany(() => Departure, (departure) => departure.student)
  departures: Departure[]; // 하교 기록

  //* N-to-M belongsToMany with custom props using 1-to-M ------------------ *//

  @OneToMany(() => Pick, (gs) => gs.student)
  picks?: Pick[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Student>) {
    Object.assign(this, partial);
  }
}
