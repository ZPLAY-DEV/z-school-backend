import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { PickRule, TermType } from 'src/common/enums';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
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
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('terms')
@Unique(['schoolId', 'schoolYear', 'termName'])
export class Term {
  @ApiProperty({ description: 'termId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '', example: 20 })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '학교명', example: '삼척 초등학교' })
  @Column({ type: 'varchar', length: 24, nullable: true })
  schoolName: string | null; // 관리자 편의를 위한 column

  @ApiProperty({ description: '학사년도', example: 2025 })
  @Column({ type: 'int', unsigned: true })
  schoolYear: number; // 학사년도

  @ApiProperty({ description: '늘봄학교 수강기간명', example: '2025-1학기' })
  @Column({ type: 'varchar', length: 16 })
  termName: string;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @Column({ type: 'varchar', length: 10 })
  start: string;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @Column({ type: 'varchar', length: 10 })
  end: string;

  @ApiProperty({ description: '🈳 시간 중복 허용 여부', default: false })
  @Column({
    type: 'boolean',
    default: false,
    comment: '시간 중복 허용',
  })
  allowTimeOverlap: boolean;

  @ApiProperty({
    description: '🈳 학생확정방식',
    default: PickRule.RANDOM,
  })
  @Column({
    type: 'enum',
    enum: PickRule,
    default: PickRule.RANDOM,
    comment: '학생확정방식',
  })
  pickRule: PickRule;

  @ApiProperty({ description: '🈳 현재 학기', default: false })
  @Column({
    type: 'enum',
    enum: TermType,
    default: TermType.REGULAR,
    comment: '현재 학기의 종류',
  })
  type: TermType;

  @ApiProperty({ description: '🈳 수강신청 준비 상태', default: false })
  @Column({
    type: 'boolean',
    default: false,
    comment: '수강신청 준비 상태. [null => 날짜] 지정시 자동으로 true',
  })
  isOfferingReady: boolean;

  @ApiProperty({ description: '🈳 현재 학기', default: false })
  @Column({
    type: 'boolean',
    default: false,
    comment: '현재 학기 여부 (현재 학기만 자동으로 출석부가 생성된다.)',
  })
  isActive: boolean;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '수강신청 시작일시 (ISO 8601)',
    example: '2025-03-06 00:00:00',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '수강신청 시작일시' })
  bookingStart: Date | null;

  @ApiProperty({
    description: '수강신청 종료일시 (ISO 8601)',
    example: '2025-03-10 00:00:00',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '수강신청 종료일시' })
  bookingEnd: Date | null;

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  @Exclude()
  updatedAt: Date;

  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  @Exclude()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school) => school.terms)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Lesson, (lesson: Lesson) => lesson.term)
  lessons: Lesson[];

  @OneToMany(() => Offering, (offering: Offering) => offering.term, {
    cascade: ['insert', 'update'],
  })
  public offerings: Offering[];

  @OneToMany(() => Newsletter, (newsletter: Newsletter) => newsletter.term)
  public newsletters: Newsletter[];

  //? 날짜 문자열을 Date 객체로 변환하는 getter ----------------------------------- ?//

  get startDate(): Date {
    return new Date(`${this.start}T09:00:00+09:00`); // UTC +9 시간대로 변환
  }

  get endDate(): Date {
    return new Date(`${this.end}T09:00:00+09:00`); // UTC +9 시간대로 변환
  }

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Term>) {
    Object.assign(this, partial);
  }
}
