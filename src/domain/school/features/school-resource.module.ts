import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Letter } from 'src/domain/letter/entities/letter.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolLetterController } from 'src/domain/school/school-letter.controller';
import { SchoolLetterService } from 'src/domain/school/school-letter.service';

@Module({
  imports: [TypeOrmModule.forFeature([Letter, Sam])],
  controllers: [SchoolLetterController],
  providers: [SchoolLetterService],
  exports: [SchoolLetterService],
})
export class SchoolResourceModule {}
