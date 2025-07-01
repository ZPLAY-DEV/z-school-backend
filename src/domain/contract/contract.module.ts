import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractController } from 'src/domain/contract/contract.controller';
import { ContractService } from 'src/domain/contract/contract.service';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { Group } from 'src/domain/group/entities/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Contract])],
  providers: [ContractService],
  controllers: [ContractController],
})
export class ContractModule {}
