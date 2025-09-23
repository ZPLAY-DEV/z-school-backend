import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  NewsletterType,
  PickRule,
  TermStatus,
  TermType,
} from 'src/common/enums';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import {
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

@Entity('terms')
@Index(['start', 'end'])
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

  @ApiProperty({
    description: '검색을 위해 varchar 에서 date 으로 변경 (YYYY-MM-DD)',
  })
  @Column({ type: 'date' })
  start: string;

  @ApiProperty({
    description: '검색을 위해 varchar 에서 date 으로 변경 (YYYY-MM-DD)',
  })
  @Column({ type: 'date' })
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

  @ApiProperty({
    description:
      '현재 학기 상태 (UPCOMING: 시작 전, ONGOING: 진행 중, FINISHED: 종료)',
    enum: TermStatus,
    example: TermStatus.ONGOING,
  })
  @Expose()
  get status(): TermStatus {
    const today = format(new Date(), 'yyyy-MM-dd');

    if (today < this.start) {
      return TermStatus.UPCOMING;
    } else if (today >= this.start && today <= this.end) {
      return TermStatus.ONGOING;
    } else {
      return TermStatus.FINISHED;
    }
  }

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

  @OneToMany(() => Schoolday, (schoolday: Schoolday) => schoolday.term)
  schooldays: Schoolday[];

  @OneToMany(() => Offering, (offering: Offering) => offering.term, {
    cascade: ['insert', 'update'],
  })
  offerings: Offering[];

  @OneToMany(() => Newsletter, (newsletter: Newsletter) => newsletter.term)
  @Exclude()
  newsletters: Newsletter[];

  @OneToMany(() => Group, (group: Group) => group.term)
  groups: Group[];

  @OneToMany(() => Booking, (booking: Booking) => booking.term)
  bookings: Booking[];

  @ApiProperty({
    description: '수강신청 뉴스레터 (type이 REGISTRATION인 newsletter)',
    type: () => Newsletter,
    nullable: true,
  })
  @Expose()
  get registrationNewsletter(): Newsletter | null {
    if (!this.newsletters) return null;
    return (
      this.newsletters.find((n) => n.type === NewsletterType.REGISTRATION) ||
      null
    );
  }

  @ApiProperty({
    description: '학기 기간 (예: 2월1일~3월1일)',
    example: '2월1일~3월1일',
  })
  @Expose()
  get period(): string {
    const startDate = new Date(this.start);
    const endDate = new Date(this.end);
    const startFormatted = format(startDate, 'M월d일');
    const endFormatted = format(endDate, 'M월d일');

    return `${startFormatted}~${endFormatted}`;
  }

  @ApiProperty({
    description:
      '수강신청 기간 (예: 2월1일 09:00~3월1일 18:00, null인 경우 "미설정")',
    example: '2월1일 09:00~3월1일 18:00',
  })
  @Expose()
  get bookingPeriod(): string {
    if (!this.bookingStart || !this.bookingEnd) {
      return '미설정';
    }

    const startFormatted = format(
      toZonedTime(this.bookingStart, 'Asia/Seoul'),
      'M월d일 HH:mm',
    );
    const endFormatted = format(
      toZonedTime(this.bookingEnd, 'Asia/Seoul'),
      'M월d일 HH:mm',
    );

    return `${startFormatted}~${endFormatted}`;
  }

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Term>) {
    Object.assign(this, partial);
  }
}
