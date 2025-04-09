import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statement } from 'src/domain/statement/entities/statement.entity';
import { StatementController } from 'src/domain/statement/statement.controller';
import { StatementService } from 'src/domain/statement/statement.service';

@Module({
  imports: [TypeOrmModule.forFeature([Statement])],
  controllers: [StatementController],
  providers: [StatementService],
})
export class StatementModule {}
