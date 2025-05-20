import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/group/entities/pick.entity';
import { GroupController } from 'src/domain/group/group.controller';
import { GroupService } from 'src/domain/group/group.service';
import { PickController } from 'src/domain/group/pick.controller';
import { PickService } from 'src/domain/group/pick.service';
import { User } from 'src/domain/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Group, Pick])],
  providers: [GroupService, PickService],
  controllers: [GroupController, PickController],
})
export class GroupModule {}
