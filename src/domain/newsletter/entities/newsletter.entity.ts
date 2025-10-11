import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray } from 'class-validator';
import { NewsletterType } from 'src/common/enums';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
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
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('newsletters')
@Index(['schoolId', 'termId'])
export class Newsletter {
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

  @ApiProperty({ description: '🈵 게시글 제목' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  title: string | null;

  @ApiProperty({ description: '🈳 게시글 본문' })
  @Column({ type: 'text', nullable: true })
  body: string | null;

  @ApiProperty({ description: '🈳 첨부 파일 URL' })
  @Column('json', { nullable: true })
  @IsArray()
  images: string[] | null;

  @ApiProperty({
    description: '발송유형 (CHANGES, MANAGEMENT, RESULT, SUPPLIES)',
  })
  @Column({
    type: 'enum',
    enum: NewsletterType,
    default: NewsletterType.CHANGES,
    comment:
      '발송유형 (수업 일정 안내, 수업 운영 안내, 수강 신청 결과, 수업 준비물 안내)',
  })
  type: NewsletterType;

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

  //* 1-to-1 hasOne -------------------------------------------------------- *//

  @OneToOne(() => Notifiable, (notifiable) => notifiable.newsletter, {
    nullable: true,
  })
  @JoinColumn({ name: 'notifiableId' })
  notifiable: Notifiable | null;

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Newsletter>) {
    Object.assign(this, partial);
  }
}
