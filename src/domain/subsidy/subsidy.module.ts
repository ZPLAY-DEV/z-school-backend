import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subsidy } from 'src/domain/subsidy/entities/subsidy.entity';
import { SubsidyController } from 'src/domain/subsidy/subsidy.controller';
import { SubsidyService } from 'src/domain/subsidy/subsidy.service';
// import { SesModule } from 'src/services/aws/ses.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subsidy])],
  providers: [SubsidyService],
  controllers: [SubsidyController],
})
export class SubsidyModule {}
