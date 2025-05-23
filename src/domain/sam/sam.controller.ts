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
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { DeleteSamNoteDto } from 'src/domain/sam/dto/delete-sam-note.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SamService } from 'src/domain/sam/sam.service';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Sams ( 학교쌤; equivalent to Student )')
@ApiCommonErrorResponseTemplate()
@Controller('sams')
export class SamController {
  constructor(private readonly samService: SamService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post()
  async create(@Body() dto: CreateSamDto): Promise<Sam> {
    return await this.samService.create(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateSamDto): Promise<Sam | null> {
    return await this.samService.dryRun(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':samId/groups')
  @ApiOperation({ summary: '이 쌤이 관리하는 반 정보들' })
  async list(@Param('samId', ParseIntPipe) samId: number): Promise<Group[]> {
    return await this.samService.list(samId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

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

  @Delete(':id')
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeleteSamNoteDto,
  ): Promise<void> {
    return await this.samService.softDelete(id, dto);
  }
}
