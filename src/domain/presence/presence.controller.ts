import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreatePresenceDto } from 'src/domain/presence/dto/create-presence.dto';
import { UpdatePresenceDto } from 'src/domain/presence/dto/update-presence.dto';
import { Presence } from 'src/domain/presence/entities/presence.entity';
import { PresenceService } from 'src/domain/presence/presence.service';

@ApiTags('✳️ Presence (출석 기록)')
@Controller('picks/:pickId/presences')
@UseInterceptors(ClassSerializerInterceptor)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get()
  async list(
    @Param('pickId', ParseIntPipe) pickId: number,
  ): Promise<Presence[]> {
    return await this.presenceService.listByPick(pickId);
  }

  @Post()
  async create(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Body() dto: CreatePresenceDto,
  ): Promise<Presence> {
    return await this.presenceService.create(pickId, dto);
  }

  @Patch(':id')
  async update(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePresenceDto,
  ): Promise<Presence> {
    return await this.presenceService.update(pickId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('pickId', ParseIntPipe) pickId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Presence> {
    return await this.presenceService.remove(pickId, id);
  }
}
