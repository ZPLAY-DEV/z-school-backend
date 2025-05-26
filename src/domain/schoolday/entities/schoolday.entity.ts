import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Group } from 'src/domain/group/entities/group.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('schooldays')
@Unique(['schoolId', 'termId', 'lessonId', 'groupId', 'startStr', 'endStr'])
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

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD HH:mm)' })
  @Column({ type: 'varchar', length: 16 })
  startStr: string; // "2025-08-14 14:20" 형식으로 저장

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD HH:mm)' })
  @Column({ type: 'varchar', length: 16 })
  endStr: string; // "2025-08-14 15:00" 형식으로 저장

  @Column({ type: 'int', unsigned: true, default: 0 })
  duration: number;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD HH:mm)' })
  @Column({ type: 'datetime', nullable: true })
  startsAt: Date;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD HH:mm)' })
  @Column({ type: 'datetime', nullable: true })
  endsAt: Date;

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
