import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray } from 'class-validator';
import {
  EventStatus,
  NewsletterTarget,
  NewsletterType,
} from 'src/common/enums';
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

  @ApiProperty({ description: '🈵 게시글 제목' })
  @Column({ type: 'varchar', length: 32 })
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
    enum: EventStatus,
    default: EventStatus.PENDING,
  })
  status: EventStatus;

  @ApiProperty({ description: '🈵 발송 대상 유형; GRADE, COURSE, STUDENT' })
  @Column({ type: 'enum', enum: NewsletterTarget })
  target: NewsletterTarget;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({ type: 'simple-array', comment: '' })
  targetItems: string[];

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({ type: 'varchar', length: 128 })
  targetLabel: string;

  @ApiProperty({ description: '🈵 관련 대상학생 ids' })
  @Column({ type: 'simple-array', comment: '관련 대상학생 Ids' })
  ids: number[];

  @ApiProperty({ description: '🈳 발송 예약 시간 (YYYY-MM-DD HH:mm:ss)' })
  @Column({ type: 'timestamp', nullable: true, comment: '발송 시간' })
  scheduledAt: Date | null;

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
