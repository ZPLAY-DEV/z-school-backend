import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolNewsletterController } from 'src/domain/school/school-newsletter.controller';
import { SchoolNewsletterService } from 'src/domain/school/school-newsletter.service';

@Module({
  imports: [TypeOrmModule.forFeature([Newsletter, Sam])],
  controllers: [SchoolNewsletterController],
  providers: [SchoolNewsletterService],
  exports: [SchoolNewsletterService],
})
export class SchoolResourceModule {}
