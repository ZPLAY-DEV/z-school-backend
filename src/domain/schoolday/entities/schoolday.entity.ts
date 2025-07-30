import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Actor } from 'src/common/enums';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('schooldays')
//? 원하는 query 성능을 위해, 인덱스 추가.
@Index('idx_school_term_start_end', [
  'schoolId',
  'termId',
  'startsAt',
  'endsAt',
])
@Index('idx_group_id_today', ['groupId', 'today'])
@Unique(['schoolId', 'termId', 'lessonId', 'groupId', 'today'])
export class Schoolday {
  @ApiProperty({ description: 'schooldayId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '학교 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true, default: null })
  schoolId: number;

  @ApiProperty({ description: '학기 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true, default: null })
  termId: number;

  @ApiProperty({ description: '수업 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true, default: null })
  lessonId: number;

  @ApiProperty({ description: '그룹 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true })
  groupId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '관리자 편의를 위해 lessonName 을 저장',
    example: null,
  })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null; // 관리자 편의를 위한 column

  @ApiProperty({
    description: '검색용 날짜',
    example: '2025-07-16',
  })
  @Column({ type: 'varchar', length: 10, comment: '수업일' })
  today: string; // '2025-07-16'

  @ApiProperty({
    description: '원래 날짜',
    example: '2025-07-16',
  })
  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: '원래 수업일',
  })
  original: string | null; // '2025-07-20'

  @ApiProperty({ description: '주차', example: 1 })
  @Column({ type: 'tinyint', unsigned: true })
  weekNumber: number;

  @ApiProperty({
    description: '시작시각 DateTime',
    example: '2025-05-27T08:00:00+09:00',
  })
  @Column({ type: 'datetime', nullable: true })
  startsAt: Date;

  @ApiProperty({
    description: '종료시각 DateTime',
    example: '2025-05-27T09:00:00+09:00',
  })
  @Column({ type: 'datetime', nullable: true })
  endsAt: Date;

  @ApiProperty({ description: '수업 시간 (분)', example: 60 })
  @Column({ type: 'int', unsigned: true, default: 0 })
  duration: number;

  @ApiProperty({ description: '시간 수정 주체', example: 'MANAGER' })
  @Column({
    type: 'enum',
    enum: Actor,
    default: null,
    nullable: true,
    comment: '시간 수정 주체',
  })
  updatedBy: Actor | null;

  @ApiProperty({ description: '비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @Column({ type: 'timestamp', nullable: true, comment: '시작 알림 시각' })
  startNotifiedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, comment: '종료 알림 시각' })
  endNotifiedAt: Date | null;

  @Exclude()
  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Group, (group) => group.schooldays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Departure, (departure) => departure.schoolday)
  departures: Departure[]; // 하교 기록

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Schoolday>) {
    Object.assign(this, partial);
  }
}
