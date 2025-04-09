import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NeisService } from 'src/services/neis/neis-service';

@Module({
  imports: [ConfigModule],
  providers: [NeisService],
  exports: [NeisService],
})
export class NeisModule {}
