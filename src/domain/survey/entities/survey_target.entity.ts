import { ApiProperty } from '@nestjs/swagger';
import { Student } from 'src/domain/student/entities/student.entity';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

//? 설문조사 대상자 (학생기준)
@Entity('survey_targets')
@Unique(['studentId', 'surveyId'])
export class SurveyTarget {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: 'schoolId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  schoolId: number;

  @ApiProperty({ description: 'termId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  termId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  studentId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  surveyId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 답변시각', example: '2025-06-26T00:30:00Z' })
  @Column({ type: 'timestamp', nullable: true, comment: '답변 시각' })
  answeredAt: Date | null;

  @ApiProperty({ description: '비고' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @CreateDateColumn()
  @ApiProperty({ description: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'updatedAt' })
  updatedAt: Date;

  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Student, (student) => student.surveyTargets)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Survey, (survey) => survey.surveyTargets)
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<SurveyTarget>) {
    Object.assign(this, partial);
  }
}
