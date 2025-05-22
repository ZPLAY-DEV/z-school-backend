import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupController } from 'src/domain/group/group.controller';
import { GroupService } from 'src/domain/group/group.service';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { PickController } from 'src/domain/pick/pick.controller';
import { PickService } from 'src/domain/pick/pick.service';
import { User } from 'src/domain/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Group, Pick])],
  providers: [GroupService, PickService],
  controllers: [GroupController, PickController],
})
export class GroupModule {}
