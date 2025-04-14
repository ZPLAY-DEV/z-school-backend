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
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { PaginateQueryOptions } from 'src/common/decorators/paginate-query-options.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ParentService } from './parent.service';

@Controller('parents')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: '주문 생성' })
  @Post()
  async create(@Body() dto: CreateParentDto) {
    return this.parentService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'paginated 주문 리스트' })
  @PaginateQueryOptions()
  @Get('paginated')
  async findAll(@Paginate() query: PaginateQuery): Promise<Paginated<Parent>> {
    return this.parentService.findAll(query);
  }

  @Public()
  @ApiOperation({ description: '주문 조회' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.parentService.findById(id, [
      'payment',
      'user',
      'user.profile',
      'items',
      'items.review',
      'items.delivery',
      'items.supports',
      'items.supports.replies',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: '주문 수정' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParentDto,
  ): Promise<Parent> {
    return this.parentService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: '주문 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Parent> {
    return this.parentService.remove(id);
  }
}
