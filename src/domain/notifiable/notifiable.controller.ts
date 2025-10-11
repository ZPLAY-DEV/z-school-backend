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
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CreateNotifiableDto } from 'src/domain/notifiable/dto/create-notifiable.dto';
import { NotifiableStatusItemDto } from 'src/domain/notifiable/dto/notifiable-status-item.dto';
import { UpdateNotifiableDto } from 'src/domain/notifiable/dto/update-notifiable.dto';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { NotifiableService } from 'src/domain/notifiable/notifiable.service';
import {
  FindPendingDispatchesDocs,
  GetNotifiableStatusItemsDocs,
  GetNotifiableStatusItemsPaginatedDocs,
  ResendNotifiableDocs,
  SaveNotifiableDocs,
  SendNotifiableDocs,
  UpdateNotifiableDocs,
} from './swagger/notifiable-swagger.decorator';

@ApiTags('✳️ Notifiables ( 알림 발송 )')
@Controller('notifiables')
@UseInterceptors(ClassSerializerInterceptor)
export class NotifiableController {
  constructor(private readonly notifiableService: NotifiableService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE / SEND
  //? ---------------------------------------------------------------------- ?//

  @SaveNotifiableDocs()
  @Post()
  async save(@Body() dto: CreateNotifiableDto): Promise<Notifiable> {
    return await this.notifiableService.save(dto);
  }

  @SendNotifiableDocs()
  @Post('send/:id')
  async send(@Param('id', ParseIntPipe) id: number): Promise<Notifiable> {
    return await this.notifiableService.send(id);
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

  @UpdateNotifiableDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotifiableDto,
  ): Promise<Notifiable> {
    return await this.notifiableService.update(id, dto);
  }

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
