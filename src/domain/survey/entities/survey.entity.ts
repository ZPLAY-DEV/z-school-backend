import { ApiProperty } from '@nestjs/swagger';
import { SurveyAnswer } from 'src/domain/survey/entities/survey_answer.entity';
import { Surveyer } from 'src/domain/survey/entities/surveyer.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('surveys')
export class Survey {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 100 })
  title: string;

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

  @Column({ type: 'json' })
  questions: any; // [{id, type, text, options?}, ...]

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Surveyer, (surveyer) => surveyer.survey)
  surveyers: Surveyer[]; // 영수증

  @OneToMany(() => SurveyAnswer, (surveyAnswer) => surveyAnswer.survey)
  surveyAnswers: SurveyAnswer[]; // 영수증
}
