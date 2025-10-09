import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { NotifiableStatusItemDto } from 'src/domain/notifiable/dto/notifiable-status-item.dto';
import { SendNotifiableDto } from 'src/domain/notifiable/dto/send-notifiable.dto';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { NotifiableService } from 'src/domain/notifiable/notifiable.service';
import {
  FindPendingDispatchesDocs,
  GetNotifiableStatusItemsDocs,
  GetNotifiableStatusItemsPaginatedDocs,
  ResendNotifiableDocs,
  SendNotifiableDocs,
} from './swagger/notifiable-swagger.decorator';

@ApiTags('✳️ Notifiables ( 알림 발송 )')
@Controller('notifiables')
@UseInterceptors(ClassSerializerInterceptor)
export class NotifiableController {
  constructor(private readonly notifiableService: NotifiableService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE / SEND
  //? ---------------------------------------------------------------------- ?//

  @SendNotifiableDocs()
  @Post('send')
  send(@Body() dto: SendNotifiableDto): Promise<Notifiable> {
    return this.notifiableService.send(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @FindPendingDispatchesDocs()
  @Get('pending')
  async findPendingItems(): Promise<Notifiable[]> {
    return await this.notifiableService.findPendingItems();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Notifiable> {
    return await this.notifiableService.findById(id);
  }

  @GetNotifiableStatusItemsDocs()
  @Get(':id/status-items')
  async getNotifiableStatusItems(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotifiableStatusItemDto[]> {
    return await this.notifiableService.getNotifiableStatusItems(id);
  }

  @GetNotifiableStatusItemsPaginatedDocs()
  @Get(':id/status-items/paginated')
  async getNotifiableStatusItemsPaginated(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<NotifiableStatusItemDto>> {
    return await this.notifiableService.getNotifiableStatusItemsPaginated(
      id,
      query,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @ResendNotifiableDocs()
  @Put(':id/resend')
  async resend(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.notifiableService.resend(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<Notifiable> {
    return await this.notifiableService.delete(id);
  }
}
