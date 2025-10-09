import { ApiProperty } from '@nestjs/swagger';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { SurveyAnswer } from 'src/domain/survey/entities/survey_answer.entity';
import { SurveyQuestion } from 'src/domain/survey/entities/survey_question.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('surveys')
export class Survey {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 schoolId (학교ID)', example: 1 })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @ApiProperty({ description: '🈳 termId (학기ID)', example: 1 })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  @ApiProperty({ description: '🈳 lessonId (과목ID)', example: 1 })
  @Column({ type: 'int', unsigned: true })
  lessonId: number;

  @ApiProperty({
    description: '🈳 groupId (반ID)',
    example: 1,
    required: false,
  })
  @Column({ type: 'int', unsigned: true, nullable: true })
  groupId: number | null;

  @ApiProperty({ description: '🈳 notifiableId (알림ID)', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  notifiableId: number | null;

  @ApiProperty({
    description: '🈳 title (만족도조사 제목)',
    example: '만족도조사 제목',
  })
  @Column({ type: 'varchar', length: 80 })
  title: string;

  @ApiProperty({
    description: '🈳 intro (만족도조사 소개)',
    example: '만족도조사 소개',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  intro: string | null;

  @ApiProperty({
    description: '🈳 outro (만족도조사 마무리)',
    example: '만족도조사 마무리',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  outro: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'KPI' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  totalRecipients: number;

  @ApiProperty({ description: 'KPI' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  totalAnswered: number;

  @ApiProperty({ description: 'KPI' })
  @Column({ type: 'json', default: null })
  result: Record<string, number> | null;

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

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: Group | null;

  //* 1-to-1 hasOne -------------------------------------------------------- *//

  @OneToOne(() => Notifiable, (notifiable) => notifiable.survey, {
    nullable: true,
  })
  @JoinColumn({ name: 'notifiableId' })
  notifiable: Notifiable | null;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => SurveyQuestion, (surveyQuestion) => surveyQuestion.survey)
  surveyQuestions: SurveyQuestion[];

  @OneToMany(() => SurveyAnswer, (surveyAnswer) => surveyAnswer.survey)
  surveyAnswers: SurveyAnswer[];
}
