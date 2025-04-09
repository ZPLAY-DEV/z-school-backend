import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { CreateLedgerDto } from 'src/domain/ledger/dto/create-ledger.dto';
import { UpdateLedgerDto } from 'src/domain/ledger/dto/update-ledger.dto';
import { Ledger } from './entities/ledger.entity';
import { LedgerService } from './ledger.service';
@Controller('ledgers')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  //* ---------------------------------------------------------------------- *//
  //* Create
  //* ---------------------------------------------------------------------- *//

  @Post()
  @ApiOperation({ summary: 'Create a new ledger' })
  async create(@Body() dto: CreateLedgerDto): Promise<Ledger> {
    return await this.ledgerService.create(dto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Read
  //* ---------------------------------------------------------------------- *//

  @Get()
  @ApiOperation({ summary: 'Get all ledgers (paginated)' })
  async findAll(@Paginate() query: PaginateQuery): Promise<Paginated<Ledger>> {
    return await this.ledgerService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ledger by id' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Ledger> {
    return await this.ledgerService.findById(id, [
      'user',
      'orderItem',
      'orderItem.product',
      'replies',
      'replies.user',
    ]);
  }

  //* ---------------------------------------------------------------------- *//
  //* Update
  //* ---------------------------------------------------------------------- *//

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ledger' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLedgerDto: UpdateLedgerDto,
  ) {
    // todo. 내 ledger 만 수정 가능토록
    return await this.ledgerService.update(id, updateLedgerDto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Delete
  //* ---------------------------------------------------------------------- *//

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ledger' })
  @ApiResponse({
    status: 200,
    description: 'The ledger has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Ledger not found.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    // todo. 내 리뷰인 경우만 삭제 가능토록
    return await this.ledgerService.remove(id);
  }
}
