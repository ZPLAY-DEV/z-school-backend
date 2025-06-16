import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Letter } from 'src/domain/letter/entities/letter.entity';
import { LetterController } from 'src/domain/letter/letter.controller';
import { LetterService } from 'src/domain/letter/letter.service';
import { NanoId } from 'src/domain/parent/entities/nanoid.entity';
import { SqsModule } from 'src/services/aws/sqs.module';
import { RedisModule } from 'src/services/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Letter, NanoId]), SqsModule, RedisModule],
  controllers: [LetterController],
  providers: [LetterService],
})
export class LetterModule {}
