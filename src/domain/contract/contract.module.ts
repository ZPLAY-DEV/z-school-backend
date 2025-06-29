import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { PickController } from 'src/domain/pick/pick.controller';
import { PickService } from 'src/domain/pick/pick.service';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Contract])],
  providers: [PickService],
  controllers: [PickController],
})
export class ContractModule {}
