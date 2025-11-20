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
import { StudentPresence } from 'src/common/interfaces';
import { GroupPresenceService } from 'src/domain/group/group-presence.service';
import { CreatePresenceDto } from 'src/domain/presence/dto/create-presence.dto';
import { UpsertPresenceDto } from 'src/domain/presence/dto/upsert-presence.dto';
import { Presence } from 'src/domain/presence/entities/presence.entity';

@ApiTags('✳️ Groups > Presence ( 반 > 출석부 조회 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('groups')
export class GroupPresenceController {
  constructor(private readonly groupPresenceService: GroupPresenceService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create/Upsert
  //? ---------------------------------------------------------------------- ?//

  @HttpCode(200)
  @Post(':groupId/presences/:week')
  async upsertBulk(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('week', ParseIntPipe) week: number,
    @Body() dtos: UpsertPresenceDto[],
  ): Promise<Presence[]> {
    return await this.groupPresenceService.upsertBulk(
      dtos.map((dto) => ({
        ...dto,
        groupId,
        week,
      })),
    );
  }

  @HttpCode(200)
  @Post(':groupId/students/:studentId/presences/:weekNumber')
  async upsert(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
    @Body() dto: CreatePresenceDto,
  ): Promise<Presence> {
    return await this.groupPresenceService.upsert({
      ...dto,
      groupId,
      studentId,
      weekNumber,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  // 학생별 출석부
  @Get(':groupId/students/:studentId/presences')
  async findByStudent(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('week', new ParseIntPipe({ optional: true }))
    week?: number,
  ): Promise<StudentPresence[]> {
    return await this.groupPresenceService.findByStudent(
      groupId,
      studentId,
      week,
    );
  }

  // 주차별 출석부
  @Get(':groupId/weeks/:week/presences')
  async findByWeek(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('week', ParseIntPipe) week: number,
    @Query('studentId', new ParseIntPipe({ optional: true }))
    studentId?: number,
    @Query('userId', new ParseIntPipe({ optional: true }))
    userId?: number,
  ): Promise<StudentPresence[]> {
    return await this.groupPresenceService.findByWeek(groupId, week, {
      studentId,
      userId,
    });
  }
}
