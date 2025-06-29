import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { ParentController } from 'src/domain/parent/parent.controller';
import { ParentService } from 'src/domain/parent/parent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Parent])],
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
