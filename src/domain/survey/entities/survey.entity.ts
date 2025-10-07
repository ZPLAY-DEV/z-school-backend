import { ApiProperty } from '@nestjs/swagger';
import { School } from 'src/domain/school/entities/school.entity';
import { SurveyAnswer } from 'src/domain/survey/entities/survey_answer.entity';
import { SurveyQuestion } from 'src/domain/survey/entities/survey_question.entity';
import { SurveyTarget } from 'src/domain/survey/entities/survey_target.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('surveys')
export class Survey {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @Column({ type: 'int', unsigned: true })
  termId: number;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  intro: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  outro: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'KPI' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  totalTargets: number;

  @ApiProperty({ description: 'KPI' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  totalResponded: number;

  @ApiProperty({ description: 'KPI' })
  @Column({ type: 'json', default: null })
  detail: Record<string, number> | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @Column({ type: 'date' })
  start: string;

  @ApiProperty({
    description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-02-01',
  })
  @Column({ type: 'date' })
  end: string;

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

  @ManyToOne(() => School, (school) => school.surveys)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @ManyToOne(() => Term, (term) => term.surveys)
  @JoinColumn({ name: 'termId' })
  term: Term;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => SurveyTarget, (surveyTarget) => surveyTarget.survey)
  surveyTargets: SurveyTarget[]; // 영수증

  @OneToMany(() => SurveyQuestion, (surveyQuestion) => surveyQuestion.survey)
  surveyQuestions: SurveyQuestion[]; // 영수증

  @OneToMany(() => SurveyAnswer, (surveyAnswer) => surveyAnswer.survey)
  surveyAnswers: SurveyAnswer[]; // 영수증
}
