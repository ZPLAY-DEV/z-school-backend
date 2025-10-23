import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray } from 'class-validator';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reminders')
@Unique(['schoolId', 'termId']) // 학기당 1개만 생성 가능
export class Reminder {
  @ApiProperty({ description: 'primary key' })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 SchoolId' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @ApiProperty({ description: '🈵 TermId' })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  @ApiProperty({ description: '🈳 NotifiableId (통합 알림 관리)' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  notifiableId: number | null;

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

  @ApiProperty({ description: '🈵 수강신청안내 제목' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  title: string | null;

  @ApiProperty({ description: '🈳 수강신청안내 본문' })
  @Column({ type: 'text', nullable: true })
  body: string | null;

  @ApiProperty({ description: '🈳 첨부 파일 URL' })
  @Column('json', { nullable: true })
  @IsArray()
  images: string[] | null;

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

  @ManyToOne(() => School, (school: School) => school.reminders)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @OneToOne(() => Term, (term: Term) => term.reminder)
  @JoinColumn({ name: 'termId' })
  term: Term;

  //* 1-to-1 hasOne -------------------------------------------------------- *//

  @OneToOne(() => Notifiable, (notifiable) => notifiable.reminder, {
    nullable: true,
  })
  @JoinColumn({ name: 'notifiableId' })
  notifiable: Notifiable | null;

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Reminder>) {
    Object.assign(this, partial);
  }
}
