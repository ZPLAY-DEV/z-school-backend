import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Transform } from 'class-transformer';
import { formatInTimeZone } from 'date-fns-tz';
import { Actor } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('schooldays')
@Index('idx_school_term_start_end', [
  'schoolId',
  'termId',
  'startsAt',
  'endsAt',
])
@Unique(['schoolId', 'termId', 'lessonId', 'groupId', 'startsAt', 'endsAt'])
export class Schoolday {
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

  @ApiProperty({ description: '미사용', example: null })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null; // 관리자 편의를 위한 column

  @ApiProperty({
    description: '시작시각 DateTime',
    example: '2025-05-27T08:00:00+09:00',
  })
  @Transform(({ value }: { value: Date | string | null | undefined }) =>
    value
      ? formatInTimeZone(value, 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ssXXX")
      : value,
  )
  @Column({ type: 'datetime', nullable: true })
  startsAt: Date;

  @ApiProperty({
    description: '종료시각 DateTime',
    example: '2025-05-27T09:00:00+09:00',
  })
  @Transform(({ value }: { value: Date | string | null | undefined }) =>
    value
      ? formatInTimeZone(value, 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ssXXX")
      : value,
  )
  @Column({ type: 'datetime', nullable: true })
  endsAt: Date;

  @ApiProperty({ description: '수업 시간 (분)', example: 60 })
  @Column({ type: 'int', unsigned: true, default: 0 })
  duration: number;

  @ApiProperty({ description: '시간 수정 주체', example: 'SYSTEM' })
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

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Schoolday>) {
    Object.assign(this, partial);
  }
}
