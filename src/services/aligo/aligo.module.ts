import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AligoService } from 'src/services/aligo/aligo.service';

@Module({
  imports: [ConfigModule],
  providers: [AligoService],
  exports: [AligoService],
})
export class AligoModule {}
