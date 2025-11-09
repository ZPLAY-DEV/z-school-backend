import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GroupPresenceService } from 'src/domain/group/group-presence.service';
import { CreatePresenceDto } from 'src/domain/presence/dto/create-presence.dto';
import { Presence } from 'src/domain/presence/entities/presence.entity';

@ApiTags('✳️ Groups > Presence ( 반 > 출석부 조회 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('groups')
export class GroupPresenceController {
  constructor(private readonly groupPresenceService: GroupPresenceService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create/Upsert
  //? ---------------------------------------------------------------------- ?//

  //
  @HttpCode(200)
  @Post(':groupId/students/:studentId/presences/:week')
  async upsert(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('week', ParseIntPipe) week: number,
    @Body() dto: CreatePresenceDto,
  ): Promise<Presence> {
    return await this.groupPresenceService.upsert({
      ...dto,
      groupId,
      studentId,
      week,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':groupId/presences/:week')
  async findByWeek(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('week', ParseIntPipe) week: number,
    @Query('studentId', ParseIntPipe) studentId?: number,
  ): Promise<Presence[]> {
    return await this.groupPresenceService.findByWeek(groupId, week, studentId);
  }

  // @Get(':groupId/presences/:date/weeks')
  // async findPresencesByWeek(
  //   @Param('groupId', ParseIntPipe) groupId: number,
  //   @Param('date') date: string, //! "2025-06-06"
  // ): Promise<Presence[]> {
  //   return await this.groupPresenceService.findWeeklyPresencesByDate(groupId, date);
  // }
}
