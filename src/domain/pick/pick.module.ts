import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { PickController } from 'src/domain/pick/pick.controller';
import { PickService } from 'src/domain/pick/pick.service';
import { Student } from 'src/domain/student/entities/student.entity';
import { User } from 'src/domain/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Pick, Student, User])],
  providers: [PickService],
  controllers: [PickController],
})
export class PickModule {}
