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
import { CreateStatementDto } from 'src/domain/statement/dto/create-statement.dto';
import { UpdateStatementDto } from 'src/domain/statement/dto/update-statement.dto';
import { Statement } from './entities/statement.entity';
import { StatementService } from './statement.service';
@Controller('statements')
export class StatementController {
  constructor(private readonly statementService: StatementService) {}

  //* ---------------------------------------------------------------------- *//
  //* Create
  //* ---------------------------------------------------------------------- *//

  @Post()
  @ApiOperation({ summary: 'Create a new statement' })
  async create(@Body() dto: CreateStatementDto): Promise<Statement> {
    return await this.statementService.create(dto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Read
  //* ---------------------------------------------------------------------- *//

  @Get()
  @ApiOperation({ summary: 'Get all statements (paginated)' })
  async findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Statement>> {
    return await this.statementService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a statement by id' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Statement> {
    return await this.statementService.findById(id, [
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
  @ApiOperation({ summary: 'Update a statement' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatementDto: UpdateStatementDto,
  ) {
    // todo. 내 statement 만 수정 가능토록
    return await this.statementService.update(id, updateStatementDto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Delete
  //* ---------------------------------------------------------------------- *//

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a statement' })
  @ApiResponse({
    status: 200,
    description: 'The statement has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Statement not found.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    // todo. 내 리뷰인 경우만 삭제 가능토록
    return await this.statementService.remove(id);
  }
}
