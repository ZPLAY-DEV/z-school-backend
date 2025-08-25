import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SlackService } from 'src/services/slack/slack.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
