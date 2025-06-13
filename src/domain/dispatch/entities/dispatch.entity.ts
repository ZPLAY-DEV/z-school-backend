import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray } from 'class-validator';
import {
  DispatchState,
  DispatchMode,
  DispatchType,
  TargetGroup,
} from 'src/common/enums';
import { School } from 'src/domain/school/entities/school.entity';
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
import { DispatchRead } from './dispatch-read.entity';
import { IDispatchTarget } from 'src/common/interfaces';

@Entity('dispatchs')
@Index(['schoolId', 'termId'])
export class Dispatch {
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
  @Column({ type: 'varchar', length: 25 }) // 널널하게 잡기 ( 실제 프론트에서는 15~16으로 지정해서 요청)
  title: string;

  @ApiProperty({ description: '🈳 게시글 본문' })
  @Column({ type: 'text', nullable: true })
  body: string | null;

  @ApiProperty({ description: '🈳 첨부 파일 URL' })
  @Column('json', { nullable: true })
  @IsArray()
  images: string[] | null;

  @ApiProperty({ description: '🈳 발송 시간 (YYYY-MM-DD HH:mm:ss)' })
  @Column({ type: 'datetime', nullable: true, comment: '발송 시간' })
  sentAt: Date | null;

  @ApiProperty({
    description: '🈵 발송 유형 ( enrollment, news, survey )',
  })
  @Column({
    type: 'enum',
    enum: DispatchType,
    comment: ' 발송 유형 ( 수강신청, 공지사항, 설문지 )',
  })
  type: DispatchType;

  @ApiProperty({ description: '🈵 알림 발송 유형' })
  @Column({
    type: 'enum',
    enum: DispatchMode,
    default: DispatchMode.IMMEDIATE,
  })
  mode: DispatchMode;

  @ApiProperty({ description: '🈵 발송 상태' })
  @Column({
    type: 'enum',
    enum: DispatchState,
    default: DispatchState.READY,
  })
  state: DispatchState;

  // @todo 네이밍 target -> tap으로 변경
  @ApiProperty({
    description:
      '🈵 발송 대상자의 상세 유형 ( 1학년, 2학년.. | 강사 n명 | 전체강좌 .. )',
  })
  @Column('json', { nullable: false })
  target: IDispatchTarget;

  @ApiProperty({
    description: '🈵 발송 대상 유형 ( student, sam )',
  })
  @Column({
    type: 'enum',
    enum: TargetGroup,
    comment: '발송 대상자 유형 ( 학생, 강사 )',
  })
  targetGroup: TargetGroup;

  @ApiProperty({ description: '🈳 예약 시간 ( 예약 발송 시 사용 )' })
  @Column({ type: 'datetime', nullable: true, comment: '예약 발송일' })
  reservationDate: Date | null;

  @ApiProperty({ description: '🈵 발송 대상자 id' })
  @Column({
    type: 'simple-array',
    comment: '발송 대상자 유형 ( 학생, 강사 )에 맞는 ids',
  })
  targetIds: number[];

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

  @ManyToOne(() => School, (school: School) => school.dispatch)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @ManyToOne(() => Term, (term: Term) => term.dispatch)
  @JoinColumn({ name: 'termId' })
  term: Term;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => DispatchRead, (dispatchRead) => dispatchRead.dispatch, {
    cascade: ['insert', 'update'],
  })
  dispatchReads: DispatchRead[];

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Dispatch>) {
    Object.assign(this, partial);
  }
}
