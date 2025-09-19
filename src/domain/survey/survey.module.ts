import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subsidy } from 'src/domain/subsidy/entities/subsidy.entity';
import { SurveyController } from 'src/domain/survey/survey.controller';
import { SurveyService } from 'src/domain/survey/survey.service';
// import { SesModule } from 'src/services/aws/ses.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subsidy])],
  providers: [SurveyService],
  controllers: [SurveyController],
})
export class SubsidyModule {}
