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
import { CreatePayoutDto } from 'src/domain/payout/dto/create-payout.dto';
import { UpdatePayoutDto } from 'src/domain/payout/dto/update-payout.dto';
import { Payout } from './entities/payout.entity';
import { PayoutService } from './payout.service';
@Controller('payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  //* ---------------------------------------------------------------------- *//
  //* Create
  //* ---------------------------------------------------------------------- *//

  @Post()
  @ApiOperation({ summary: 'Create a new payout' })
  async create(@Body() dto: CreatePayoutDto): Promise<Payout> {
    return await this.payoutService.create(dto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Read
  //* ---------------------------------------------------------------------- *//

  @Get()
  @ApiOperation({ summary: 'Get all payouts (paginated)' })
  async findAll(@Paginate() query: PaginateQuery): Promise<Paginated<Payout>> {
    return await this.payoutService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payout by id' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Payout> {
    return await this.payoutService.findById(id, [
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
  @ApiOperation({ summary: 'Update a payout' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePayoutDto: UpdatePayoutDto,
  ) {
    // todo. 내 payout 만 수정 가능토록
    return await this.payoutService.update(id, updatePayoutDto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Delete
  //* ---------------------------------------------------------------------- *//

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payout' })
  @ApiResponse({
    status: 200,
    description: 'The payout has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Payout not found.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    // todo. 내 리뷰인 경우만 삭제 가능토록
    return await this.payoutService.remove(id);
  }
}
