import { ApiProperty } from '@nestjs/swagger';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('survey_answers')
export class SurveyAnswer {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  surveyId: number;

  @Column({ type: 'int', unsigned: true })
  studentId: number;

  @Column({ type: 'json' })
  answers: any; // [{questionId, optionId?, text?}, ...]

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

  @ManyToOne(() => Survey, (survey) => survey.surveyAnswers)
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;
}
