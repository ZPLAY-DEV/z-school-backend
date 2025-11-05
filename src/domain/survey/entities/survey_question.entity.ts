import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from 'src/common/enums/question-type';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';

@Entity('survey_questions')
export class SurveyQuestion {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  surveyId: number;

  @Column({ type: 'varchar', length: 255 })
  question: string; // [{questionId, optionId?, text?}, ...]

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType; // [{questionId, optionId?, text?}, ...]

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Survey, (survey) => survey.surveyAnswers)
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;
}
