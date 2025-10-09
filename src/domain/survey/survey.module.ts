import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { NotifiableModule } from 'src/domain/notifiable/notifiable.module';
import { Student } from 'src/domain/student/entities/student.entity';
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
      Student,
    ]),
    forwardRef(() => NotifiableModule),
  ],
  providers: [SurveyService],
  controllers: [SurveyController],
})
export class SurveyModule {}
