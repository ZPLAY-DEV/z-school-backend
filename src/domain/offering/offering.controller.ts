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
import { PaginateQueryOptions } from 'src/common/decorators/paginate-query-options.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateOfferingDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateOfferingDto } from 'src/domain/term/dto/update-term.dto';
import { Offering } from 'src/domain/term/entities/term.entity';
import { OfferingService } from 'src/domain/term/term.service';
import { UploadService } from 'src/services/upload/upload.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('terms')
export class OfferingController {
  constructor(
    private readonly termService: OfferingService,
    private readonly uploadService: UploadService,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Offering 생성' })
  @Post()
  async create(@Body() createOfferingDto: CreateOfferingDto) {
    return this.termService.create(createOfferingDto);
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Offering 리스트 w/ Pagination' })
  @PaginateQueryOptions()
  @Public()
  @Get('paginated')
  async getAdminOfferings(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Offering>> {
    return await this.termService.findAll(query);
  }

  @ApiOperation({ description: 'Offering 리스트 w/ Pagination' })
  @PaginateQueryOptions()
  @Public()
  @Get()
  async getOfferings(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Offering>> {
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
  async getActiveOfferings(): Promise<Offering[]> {
    return await this.termService.findActive();
  }

  @ApiOperation({ description: 'Offering 상세보기' })
  @Public()
  @Get(':id')
  async getOfferingById(@Param('id') id: number): Promise<Offering> {
    return await this.termService.findById(id, [
      'lessons',
      'lessons.groups',
      'lessons.groups.instructor',
    ]);
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Offering 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateOfferingDto,
  ): Promise<Offering> {
    return await this.termService.update(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Offering 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Offering> {
    return await this.termService.remove(id);
  }
}
