import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { PresenceController } from 'src/domain/presence/presence.controller';
import { PresenceService } from 'src/domain/presence/presence.service';
import { Presence } from 'src/domain/presence/entities/presence.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pick, Presence])],
  providers: [PresenceService],
  controllers: [PresenceController],
})
export class PresenceModule {}

