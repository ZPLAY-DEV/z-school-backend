import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentRule, Weekday } from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { School } from 'src/domain/school/entities/school.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

//? 학교 수강신청 리스트 페이지에서 보여주는 아이템.
//? - 반 정보와 유사하고 중복되더라도 v2/v3 수강신청로직 공유을 위해 별도로 유지필요.
//? - 수강신청기간에만 valid 한 entries 이 들어 있으면 되므로 학기 정보는 필요없음.

@Entity('offerings')
export class Offering {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: 'v2 에는 schoolId 가 없음' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  schoolId: number | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '학교명' })
  @Column({ type: 'varchar', length: 32 })
  schoolName: string;

  @ApiProperty({ description: '과목이름' })
  @Column({ type: 'varchar', length: 16 })
  lessonName: string;

  @ApiProperty({ description: '반이름' })
  @Column({ type: 'varchar', length: 16 })
  groupName: string;

  @ApiProperty({ description: '🈵 요일' })
  @Column({ type: 'enum', enum: Weekday })
  weekday: Weekday;

  @ApiProperty({ description: '🈵 시작시각' })
  @Column({ type: 'varchar', length: 5 }) // MySQL TIME 타입
  started: string;

  @ApiProperty({ description: '🈵 종료시각' })
  @Column({ type: 'varchar', length: 5 }) // MySQL TIME 타입
  ended: string;

  @Column('simple-array')
  bitmasks: number[];

  @Column('simple-array')
  allowedGrades: number[];

  @Column('simple-array')
  formerStudentIds: number[];

  @Column({
    type: 'enum',
    enum: EnrollmentRule,
    default: EnrollmentRule.FIRST_COME,
  })
  enrollmentRule: EnrollmentRule;

  @Column({ default: false })
  allowTimeOverlap: boolean;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school) => school.offerings)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Booking, (booking) => booking.student)
  bookings: Booking[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Offering>) {
    Object.assign(this, partial);
  }
}
