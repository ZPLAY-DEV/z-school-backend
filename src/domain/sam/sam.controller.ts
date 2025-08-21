import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BulkUpdateSamsDto } from 'src/domain/sam/dto/bulk-update-sams.dto';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { GroupWithPicksCount, Sam } from 'src/domain/sam/entities/sam.entity';
import { SamService } from 'src/domain/sam/sam.service';
import {
  BulkUpdateSamsDocs,
  CreateSamDocs,
  GetAllSchooldaysDocs,
  GetSamByIdDocs,
  GetSamGroupsDocs,
  GetSchooldaysByDateDocs,
  SamDryRunDocs,
  SoftDeleteSamDocs,
  UpdateSamDocs,
} from 'src/domain/sam/swagger/sam.swagger.decorator';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';

@ApiTags('✳️ Sams ( 담임쌤 )')
@Controller('sams')
@UseInterceptors(ClassSerializerInterceptor)
export class SamController {
  constructor(private readonly samService: SamService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSamDocs()
  @ApiOperation({ description: '담임쌤(Sam) 생성' })
  @Post()
  async create(@Body() dto: CreateSamDto): Promise<Sam> {
    return await this.samService.create(dto);
  }

  @SamDryRunDocs()
  @ApiOperation({ description: '담임쌤(Sam) 생성 dryRun 체크' })
  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateSamDto): Promise<Sam | null> {
    return await this.samService.dryRun(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetSamGroupsDocs()
  @Get(':id/groups')
  async getGroupsById(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
    @Query('sortBy') sortBy?: string,
  ): Promise<GroupWithPicksCount[]> {
    return await this.samService.getGroupsById(id, termId, sortBy);
  }

  @GetAllSchooldaysDocs()
  @Get(':id/all-schooldays')
  async getSchooldays(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
  ): Promise<Schoolday[]> {
    return await this.samService.getAllSchooldays(id, termId);
  }

  @GetSchooldaysByDateDocs()
  @Get(':id/schooldays')
  async getSchooldaysByDate(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
    @Query('termId') termId?: number,
  ): Promise<Schoolday[]> {
    return await this.samService.getSchooldaysByDate(id, date, termId);
  }

  @GetSamByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Sam> {
    return await this.samService.findById(id, [
      'instructor',
      'contracts',
      'contracts.group',
      'contracts.group.schooldays',
      'contracts.lesson',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @BulkUpdateSamsDocs()
  @Patch('bulk')
  async updateBulk(@Body() dto: BulkUpdateSamsDto): Promise<Sam[]> {
    return await this.samService.bulkUpdate(dto);
  }

  @UpdateSamDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSamDto,
  ) {
    return await this.samService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @SoftDeleteSamDocs()
  @Delete(':id')
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
    @Body('note') note?: string,
  ): Promise<void> {
    return await this.samService.softDelete(id, note);
  }
}
