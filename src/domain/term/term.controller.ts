import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateTermDto } from 'src/domain/term/dto/update-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import { TermService } from 'src/domain/term/term.service';
import { UploadService } from 'src/services/upload/upload.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('terms')
export class TermController {
  constructor(
    private readonly termService: TermService,
    private readonly uploadService: UploadService,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Term 생성' })
  @Post()
  async create(@Body() createTermDto: CreateTermDto) {
    return this.termService.create(createTermDto);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Term 리스트 w/ Pagination' })
  
  @Public()
  @Get('paginated')
  async getAdminTerms(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Term>> {
    return await this.termService.findAll(query);
  }

  @ApiOperation({ description: 'Term 리스트 w/ Pagination' })
  
  @Public()
  @Get()
  async getTerms(@Paginate() query: PaginateQuery): Promise<Paginated<Term>> {
    const activeQuery = {
      ...query,
      filter: {
        isActive: '1',
      },
    };
    return await this.termService.findAll(activeQuery);
  }

  @ApiOperation({ description: '모든 active 배너 리스트' })
  @Public()
  @Get('active')
  async getActiveTerms(): Promise<Term[]> {
    return await this.termService.findActive();
  }

  @ApiOperation({ description: 'Term 상세보기' })
  @Public()
  @Get(':id')
  async getTermById(@Param('id') id: number): Promise<Term> {
    return await this.termService.findById(id, [
      'lessons',
      'lessons.groups',
      'lessons.groups.instructor',
    ]);
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Term 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateTermDto,
  ): Promise<Term> {
    return await this.termService.update(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Term 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Term> {
    return await this.termService.remove(id);
  }
}
