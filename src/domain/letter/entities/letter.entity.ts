import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray } from 'class-validator';
import {
  EventStatus,
  LetterTarget,
  LetterType,
  SendMode
} from 'src/common/enums';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('letters')
@Index(['schoolId', 'termId'])
export class Letter {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 School ID' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @ApiProperty({ description: '🈵 Term ID' })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 게시글 제목' })
  @Column({ type: 'varchar', length: 32 }) // 널널하게 잡기 ( 실제 프론트에서는 15~16으로 지정해서 요청)
  title: string;

  @ApiProperty({ description: '🈳 게시글 본문' })
  @Column({ type: 'text' })
  body: string;

  @ApiProperty({ description: '🈳 첨부 파일 URL' })
  @Column('json', { nullable: true })
  @IsArray()
  images: string[] | null;

  @ApiProperty({
    description: '🈵 발송 유형 ( enrollment, news, survey )',
  })
  @Column({
    type: 'enum',
    enum: LetterType,
    comment: ' 발송 유형 ( 수강신청, 공지사항, 설문지 )',
  })
  type: LetterType;

  @ApiProperty({ description: '🈵 발송 상태' })
  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.PENDING,
  })
  status: EventStatus;

  @ApiProperty({ description: '🈵 발송 대상 유형; GRADE, COURSE, STUDENT' })
  @Column({ type: 'enum', enum: LetterTarget })
  targetGroup: LetterTarget;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({ type: 'simple-array', comment: '' })
  targetGroupItems: string[];

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({ type: 'varchar', length: 64 })
  targetGroupLabel: string;

  @ApiProperty({ description: '🈵 발송 대상자 id' })
  @Column({
    type: 'simple-array',
    comment: '발송 대상자 유형 ( 학생, 강사 )에 맞는 ids',
  })
  ids: number[];

  @ApiProperty({ description: '🈵 알림 발송 유형' })
  @Column({
    type: 'enum',
    enum: SendMode,
    default: SendMode.IMMEDIATE,
  })
  sendMode: SendMode;

  @ApiProperty({ description: '🈳 발송 시간 (YYYY-MM-DD HH:mm:ss)' })
  @Column({ type: 'datetime', nullable: true, comment: '발송 시간' })
  sendAt: Date | null;

  @ApiProperty({ description: '🈳 예약 시간 (YYYY-MM-DD HH:mm:ss)' })
  @Column({ type: 'datetime', nullable: true, comment: '발송 시간' })
  scheduleAt: Date | null;

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

  @ManyToOne(() => School, (school: School) => school.letters)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @ManyToOne(() => Term, (term: Term) => term.letters)
  @JoinColumn({ name: 'termId' })
  term: Term;

  //* N-to-M manyToMany ---------------------------------------------------- *//

  @ManyToMany(() => Parent, (parent) => parent.letters)
  @JoinTable() // ownership 관계) letter 가 대상자를 선택하므로 주인으로 본다.
  parents: Parent[];

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Letter>) {
    Object.assign(this, partial);
  }
}
