import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payout } from 'src/domain/payout/entities/payout.entity';
import { PayoutController } from 'src/domain/payout/payout.controller';
import { PayoutService } from 'src/domain/payout/payout.service';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payout]), UploadModule],
  controllers: [PayoutController],
  providers: [PayoutService],
})
export class PayoutModule {}
