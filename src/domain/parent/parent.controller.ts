import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ParentService } from './parent.service';
import {
  DeleteParentDocs,
  FindAllParentDocs,
  FindParentDocs,
  UpdateParentDocs,
} from './swagger/parent-swagger.decorator';

@ApiTags('✳️ Parents ( 학부모 )')
@Controller('parents')
@UseInterceptors(ClassSerializerInterceptor)
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindAllParentDocs()
  @Get('paginated')
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Parent>> {
    return this.parentService.infiniteList(query);
  }

  @FindParentDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.findById(id, ['students']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateParentDocs()
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

  @DeleteParentDocs()
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Parent> {
    return this.parentService.remove(id);
  }
}
