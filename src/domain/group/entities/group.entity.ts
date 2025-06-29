import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Actor, ClassStatus, Weekday } from 'src/common/enums';
import { Board } from 'src/domain/board/entities/board.entity';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
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

// Group 보단 Class 가 더 적합하겠지만, Class 는 reserved keyword 이므로 탈락
@Entity('groups')
@Unique(['lessonId', 'groupName'])
export class Group {
  @ApiProperty({ description: 'groupId' })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 exclusively exists in instructor' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  samId: number;

  @ApiProperty({ description: '🈵 exclusively exists in lesson' })
  @Column({ type: 'int', unsigned: true })
  lessonId: number;

  //* ---------------------------------------------------------------------- *//

  @ApiProperty({ description: '🈵 반이름' })
  @Column({ type: 'varchar', length: 32 })
  groupName: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  location: string | null;

  @ApiProperty({ description: '🈳 class size' })
  @Column({ type: 'tinyint', unsigned: true, default: 20 })
  capacity: number;

  @ApiProperty({ description: '🈳 a comma separated string format' })
  @Column({ type: 'varchar', length: 16 })
  allowedGrades: string;

  @ApiProperty({
    description: '수업 요일',
    enum: Weekday,
    example: Weekday.MONDAY,
  })
  @Column({ type: 'enum', enum: Weekday })
  weekday: Weekday;

  @ApiProperty({ description: '수업 시작 시간 (HH:mm)', example: '14:40' })
  @Column({ type: 'varchar', length: 5 })
  start: string;

  @ApiProperty({ description: '수업 종료 시간 (HH:mm)', example: '15:20' })
  @Column({ type: 'varchar', length: 5 })
  end: string;

  @ApiProperty({ description: '🈵 상태' })
  @Column({
    type: 'enum',
    enum: ClassStatus,
    default: ClassStatus.PENDING,
  })
  status: ClassStatus;

  @ApiProperty({ description: '🈵 수업료 합계 (A+B+C+D)' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  tuition: number;

  @ApiProperty({ description: '🈳 B. 도서구매비 배열(낮은가격순 정렬)' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  bookFee: number;

  @ApiProperty({ description: '🈳 C. 재료구매비 배열(낮은가격순 정렬)' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  materialFee: number;

  @ApiProperty({ description: '🈳 총 수업일 수', example: 18 })
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  days: number;

  @ApiProperty({ description: '🈳 누가 삭제했나?', example: Actor.INSTRUCTOR })
  @Column({
    type: 'enum',
    enum: Actor,
    nullable: true,
    default: null,
    comment: '누가 삭제했나?',
  })
  deletedBy: Actor | null;

  @ApiProperty({ description: '🈳 비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @ApiProperty({ description: '관련 groups', type: [Group], isArray: true })
  @OneToMany(() => Schoolday, (schoolday) => schoolday.group, {
    cascade: true,
  })
  public schooldays: Schoolday[];

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Lesson, (lesson) => lesson.groups)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  //* N-to-M belongsToMany with custom props using 1-to-M ------------------ *//

  @OneToMany(() => Pick, (pick) => pick.group)
  picks: Pick[];

  @OneToMany(() => Contract, (contract) => contract.group)
  contracts: Contract[];

  @OneToMany(() => Board, (board) => board.group)
  boards: Board[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Group>) {
    Object.assign(this, partial);
  }
}
