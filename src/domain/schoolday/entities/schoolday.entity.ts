import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
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

  @Column({ type: 'int', unsigned: true, default: null })
  schoolId: number;

  @Column({ type: 'int', unsigned: true, default: null })
  termId: number;

  @Column({ type: 'int', unsigned: true, default: null })
  lessonId: number;

  @Column({ type: 'int', unsigned: true })
  groupId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '휴일/행사일 이름' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null; // 관리자 편의를 위한 column

  @ApiProperty({ description: '시작시각 DateTime' })
  @Column({ type: 'datetime', nullable: true })
  startsAt: Date;

  @ApiProperty({ description: '종료시각 DateTime' })
  @Column({ type: 'datetime', nullable: true })
  endsAt: Date;

  @Column({ type: 'int', unsigned: true, default: 0 })
  duration: number;

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
