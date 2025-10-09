import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { SurveyAnswer } from 'src/domain/survey/entities/survey_answer.entity';
import { SurveyQuestion } from 'src/domain/survey/entities/survey_question.entity';
import { SurveyController } from 'src/domain/survey/survey.controller';
import { SurveyService } from 'src/domain/survey/survey.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Survey,
      SurveyQuestion,
      SurveyAnswer,
      Notifiable,
      Recipient,
    ]),
  ],
  providers: [SurveyService],
  controllers: [SurveyController],
})
export class SurveyModule {}
