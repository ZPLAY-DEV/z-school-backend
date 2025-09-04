import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray } from 'class-validator';
import { NewsletterType } from 'src/common/enums';
import { Dispatch } from 'src/domain/newsletter/entities/dispatch.entity';
import { Shortlink } from 'src/domain/newsletter/entities/shortlink.entity';
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
    description: '발송 유형 ( REGISTRATION, NEWS, SURVEY )',
  })
  @Column({
    type: 'enum',
    enum: NewsletterType,
    default: NewsletterType.REGISTRATION,
    comment: '발송 유형 ( 수강신청, 공지사항, 설문지 )',
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

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Shortlink, (shortlink) => shortlink.newsletter, {
    cascade: ['insert', 'update'],
  })
  shortlinks: Shortlink[];

  @OneToMany(() => Dispatch, (dispatch) => dispatch.newsletter, {
    cascade: ['insert', 'update'],
  })
  dispatches: Dispatch[];

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Newsletter>) {
    Object.assign(this, partial);
  }
}
