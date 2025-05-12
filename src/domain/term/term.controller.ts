import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { Term } from 'src/domain/term/entities/term.entity';
import { TermService } from 'src/domain/term/term.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('terms')
export class TermController {
  constructor(private readonly termService: TermService) {}

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Term 상세보기' })
  @Public()
  @Get(':id')
  async getTermById(@Param('id') id: number): Promise<Term> {
    return await this.termService.findById(id, [
      'lessons',
      'lessons.groups',
      'lessons.groups.instructor',
      'offerings',
    ]);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Term 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Term> {
    return await this.termService.softRemove(id);
  }
}
