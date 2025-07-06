import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray } from 'class-validator';
import { NewsletterTarget, NewsletterType } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { School } from 'src/domain/school/entities/school.entity';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { Term } from 'src/domain/term/entities/term.entity';
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
  UpdateDateColumn,
} from 'typeorm';

@Entity('newsletters')
@Index(['schoolId', 'termId'])
export class Newsletter {
  @ApiProperty({ description: 'newsletterId' })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 SchoolId' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @ApiProperty({ description: '🈵 TermId' })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈳 학교명',
    example: '홍익대학교 사범대학 부속 초등학교',
  })
  @Column({ type: 'varchar', length: 24 })
  schoolName: string; // 관리자 편의를 위한 Column.

  @ApiProperty({ description: '늘봄학교 수강기간명', example: '2025-1학기' })
  @Column({ type: 'varchar', length: 16 })
  termName: string;

  @ApiProperty({ description: '🈵 게시글 제목' })
  @Column({ type: 'varchar', length: 64 })
  title: string;

  @ApiProperty({ description: '🈳 게시글 본문' })
  @Column({ type: 'text' })
  body: string;

  @ApiProperty({ description: '🈳 첨부 파일 URL' })
  @Column('json', { nullable: true })
  @IsArray()
  images: string[] | null;

  @ApiProperty({
    description: '발송 유형 ( REGISTRATION, NEWS, SURVEY )',
  })
  @Column({
    type: 'enum',
    enum: NewsletterType,
    comment: '발송 유형 ( 수강신청, 공지사항, 설문지 )',
  })
  type: NewsletterType;

  @ApiProperty({ description: '🈵 발송 상태' })
  @Column({
    type: 'enum',
    enum: SendStatus,
    default: SendStatus.INIT,
  })
  status: SendStatus;

  @ApiProperty({
    description: '🈵 발송 대상 유형; SCHOOL, GRADE, LESSON, GROUP, STUDENT',
    example: NewsletterTarget.SCHOOL,
  })
  @Column({
    type: 'enum',
    enum: NewsletterTarget,
    default: NewsletterTarget.SCHOOL,
    nullable: true,
  })
  target: NewsletterTarget | null;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({
    type: 'simple-array',
    comment: '대상별 아이템 아이디',
    nullable: true,
  })
  targetItems: number[] | null;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  targetLabel: string | null;

  @ApiProperty({ description: '🈵 관련 모든 studentIds', example: [1, 2, 3] })
  @Column({
    type: 'simple-array',
    comment: '관련 모든 studentIds',
    nullable: true,
  })
  studentIds: number[] | null;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({ type: 'json', nullable: true })
  payload: {
    type: string;
    schoolId: number;
    role: string;
    messages: any[];
  } | null;

  @ApiProperty({
    description: '🈳 발송 예약 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '발송예약 시각' })
  scheduledAt: Date | null;

  @ApiProperty({
    description: '🈳 재발송 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '재발송 시각' })
  resentAt: Date | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt', nullable: true })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school: School) => school.newsletters)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @ManyToOne(() => Term, (term: Term) => term.newsletters)
  @JoinColumn({ name: 'termId' })
  term: Term;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Shortlink, (shortlink) => shortlink.newsletter, {
    cascade: ['insert', 'update'],
  })
  shortlinks: Shortlink[];

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Newsletter>) {
    Object.assign(this, partial);
  }
}
