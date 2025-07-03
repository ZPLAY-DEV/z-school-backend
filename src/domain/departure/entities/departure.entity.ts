import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
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
@Index('idx_student_departed', ['studentId', 'departuredAt'])
@Index('idx_schoolday', ['schooldayId'])
export class Departure {
  @ApiProperty({ description: 'departureId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '학생 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true })
  studentId: number;

  @ApiProperty({ description: '실제 마지막 참석 수업 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true })
  schooldayId: number;

  @ApiProperty({ description: '하교시 메모', example: '정상 하교' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @ApiProperty({
    description: '하교시간',
    example: '2025-01-15T15:30:00.000Z',
  })
  @Column({ type: 'datetime' })
  departuredAt: Date;

  @Exclude()
  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
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
