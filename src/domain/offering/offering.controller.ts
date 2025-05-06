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
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingService } from 'src/domain/offering/offering.service';
import { UploadService } from 'src/services/upload/upload.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('offerings')
export class OfferingController {
  constructor(
    private readonly offeringService: OfferingService,
    private readonly uploadService: UploadService,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Offering 생성' })
  @Post()
  async create(@Body() dto: CreateOfferingDto): Promise<Offering> {
    return this.offeringService.create(dto);
  }

  @Public()
  @ApiOperation({ description: 'Offering seed 생성' })
  @Post('seed')
  async seed(): Promise<Offering[]> {
    return this.offeringService.seed();
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Offering 리스트 w/ Pagination' })
  @Public()
  @Get('paginated')
  async getAdminOfferings(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Offering>> {
    return await this.offeringService.findAll(query);
  }

  @ApiOperation({ description: 'Offering 리스트 w/ Pagination' })
  @Public()
  @Get()
  async getOfferings(): Promise<Offering[]> {
    return await this.offeringService.list();
  }

  @ApiOperation({ description: '모든 offering 리스트' })
  @Public()
  @Get()
  async getActiveOfferings(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Offering[]> {
    return await this.offeringService.findBySchoolId(schoolId);
  }

  @ApiOperation({ description: 'Offering 상세보기' })
  @Public()
  @Get(':id')
  async getOfferingById(@Param('id') id: number): Promise<Offering> {
    return await this.offeringService.findById(id, ['bookings']);
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
    return await this.offeringService.update(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Offering 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Offering> {
    return await this.offeringService.remove(id);
  }
}
