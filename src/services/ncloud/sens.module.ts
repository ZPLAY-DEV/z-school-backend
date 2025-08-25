import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SensService } from 'src/services/ncloud/sens.service';

@Module({
  imports: [ConfigModule],
  providers: [SensService],
  exports: [SensService],
})
export class SensModule {}
