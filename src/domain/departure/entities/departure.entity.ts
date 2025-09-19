import { ApiProperty } from '@nestjs/swagger';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
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

@Entity('departures')
@Unique(['studentId', 'schooldayId'])
@Index(['date', 'studentId'])
export class Departure {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '학생 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true, comment: '학생 아이디' })
  studentId: number;

  @ApiProperty({ description: '실제 마지막 참석 수업 아이디', example: 1 })
  @Column({
    type: 'int',
    unsigned: true,
    comment: '마지막 참석 수업시간 아이디',
  })
  schooldayId: number;

  @ApiProperty({ description: '하교 날짜', example: '2025-07-07' })
  @Column({
    type: 'date',
    comment: '하교 날짜 (schoolday 날짜와 동일, 쿼리 최적화를 위한 비정규화)',
  })
  date: string;

  @ApiProperty({ description: '하교시 메모', example: '정상 하교' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Student, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Schoolday, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'schooldayId' })
  schoolday: Schoolday;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Departure>) {
    Object.assign(this, partial);
  }
}
