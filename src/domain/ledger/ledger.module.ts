import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ledger } from 'src/domain/ledger/entities/ledger.entity';
import { LedgerController } from 'src/domain/ledger/ledger.controller';
import { LedgerService } from 'src/domain/ledger/ledger.service';
import { SlackModule } from 'src/services/slack/slack-module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ledger]), UploadModule, SlackModule],
  controllers: [LedgerController],
  providers: [LedgerService],
})
export class LedgerModule {}
