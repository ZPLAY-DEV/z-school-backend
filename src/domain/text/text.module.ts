import { Module } from '@nestjs/common';
import { AligoModule } from 'src/services/aligo/aligo-module';
import { TextController } from './text.controller';
import { TextService } from './text.service';

@Module({
  imports: [AligoModule],
  controllers: [TextController],
  providers: [TextService],
})
export class TextModule {}
