import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { AlarmService } from 'src/domain/alarm/alarm.service';
import { CreateAlarmDto } from 'src/domain/alarm/dto/create-alarm.dto';
import { IAlarm, IAlarmKey } from 'src/domain/alarm/entities/alarm.interface';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('alarms')
export class AlarmController {
  constructor(private readonly alarmsService: AlarmService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Alarm 생성' })
  @Post()
  async create(
    @CurrentUserId() userId: number,
    @Body() createAlarmDto: CreateAlarmDto,
  ): Promise<IAlarm> {
    const dto = { ...createAlarmDto };
    if (!Object.prototype.hasOwnProperty.call(dto, 'userId')) {
      dto['userId'] = userId;
    }
    return await this.alarmsService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Alarm 리스트' })
  @Get()
  async fetch(
    @CurrentUserId() userId: number,
    @Query('lastId') lastId: string | undefined,
  ): Promise<any> {
    const lastKey = lastId
      ? {
          userId,
          id: lastId,
        }
      : null;

    console.log(`userId =`, userId, `lastKey =`, lastKey ?? 'null'); // todo. remove this log
    const res = await this.alarmsService.fetch(userId, lastKey);
    console.log(`res`, res); // todo. remove this log

    return {
      lastKey: res.lastKey,
      count: res.count,
      items: res,
    };
  }

  //! do we need this?
  @ApiOperation({ description: 'Alarm 상세보기' })
  @Get(':id')
  async getAlarmById(
    @CurrentUserId() userId: number,
    @Param('id') id: string,
  ): Promise<IAlarm> {
    return await this.alarmsService.findById({
      userId,
      id,
    } as IAlarmKey);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @Patch(':id/read')
  async markAsRead(
    @CurrentUserId() userId: number,
    @Param('id') id: string,
  ): Promise<any> {
    await this.alarmsService.markAsRead(userId, id);
    return {
      data: 'ok',
    };
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Alarm 삭제' })
  @Delete(':id')
  async delete(
    @CurrentUserId() userId: number,
    @Param('id') id: string,
  ): Promise<any> {
    await this.alarmsService.delete({
      userId: userId,
      id: id,
    } as IAlarmKey);
    return {
      data: 'ok',
    };
  }
}
