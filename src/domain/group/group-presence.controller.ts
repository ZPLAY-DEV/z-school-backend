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
import { IStudentPresence } from 'src/common/interfaces';
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

  @HttpCode(200)
  @Post(':groupId/weeks/:weekNumber/presences/bulk')
  async upsertBulk(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
    @Body() dtos: CreatePresenceDto[],
  ): Promise<Presence[]> {
    return await this.groupPresenceService.upsertBulk(
      dtos.map((dto) => ({
        ...dto,
        groupId,
        weekNumber,
      })),
    );
  }

  @HttpCode(200)
  @Post(':groupId/students/:studentId/presences')
  async upsert(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: CreatePresenceDto,
  ): Promise<Presence> {
    return await this.groupPresenceService.upsert({
      ...dto,
      groupId,
      studentId,
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
    @Query('weekNumber', new ParseIntPipe({ optional: true }))
    weekNumber?: number,
  ): Promise<IStudentPresence[]> {
    return await this.groupPresenceService.findByStudent(
      groupId,
      studentId,
      weekNumber,
    );
  }

  // 주차별 출석부
  @Get(':groupId/weeks/:weekNumber/presences')
  async findByWeek(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
    @Query('studentId', new ParseIntPipe({ optional: true }))
    studentId?: number,
    @Query('userId', new ParseIntPipe({ optional: true }))
    userId?: number,
  ): Promise<IStudentPresence[]> {
    return await this.groupPresenceService.findByWeek(groupId, weekNumber, {
      studentId,
      userId,
    });
  }
}
