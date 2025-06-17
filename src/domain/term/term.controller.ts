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
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateTermDto } from 'src/domain/term/dto/update-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  CreateTermDocs,
  DeleteTermDocs,
  FindTermDocs,
  UpdateTermDocs,
} from 'src/domain/term/swagger/term-swagger.decorator';
import { TermService } from 'src/domain/term/term.service';

@ApiTags('✅ Terms ( 학기 )')
@Controller('terms')
@UseInterceptors(ClassSerializerInterceptor)
export class TermController {
  constructor(private readonly termService: TermService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateTermDocs()
  @ApiOperation({ description: '학기(Term) 생성' })
  @Post()
  async create(@Body() dto: CreateTermDto): Promise<Term> {
    return await this.termService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindTermDocs()
  @ApiOperation({ description: '학기(Term) 조회' })
  @Public()
  @Get(':id')
  async getTermById(@Param('id', ParseIntPipe) id: number): Promise<Term> {
    return await this.termService.findById(id, [
      'lessons',
      'lessons.groups',
      'lessons.groups.sam',
      'offerings',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateTermDocs()
  @ApiOperation({ description: '학기(Term) 수정' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTermDto,
  ): Promise<Term> {
    return await this.termService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteTermDocs()
  @ApiOperation({ description: '학기(Term) 삭제' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Term> {
    return await this.termService.softRemove(id);
  }
}
