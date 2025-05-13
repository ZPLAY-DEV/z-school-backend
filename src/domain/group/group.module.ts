import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupStudentController } from 'src/domain/group/group-student.controller';
import { GroupStudentService } from 'src/domain/group/group-student.service';
import { GroupController } from 'src/domain/group/group.controller';
import { GroupService } from 'src/domain/group/group.service';
import { User } from 'src/domain/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Group])],
  providers: [GroupService, GroupStudentService],
  controllers: [GroupController, GroupStudentController],
})
export class GroupModule {}
