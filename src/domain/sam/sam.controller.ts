import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Group } from 'src/domain/group/entities/group.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { DeleteSamNoteDto } from 'src/domain/sam/dto/delete-sam-note.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SamService } from 'src/domain/sam/sam.service';
import {
  CreateSamDocs,
  GetSamByIdDocs,
  GetSamGroupsDocs,
  SamDryRunDocs,
  SamScheduleFindByIdDocs,
  SoftDeleteSamDocs
} from './swagger/sam.swagger.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Sams ( 학교쌤 ≓ Student )')
@Controller('sams')
export class SamController {
  constructor(private readonly samService: SamService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSamDocs()
  @Post()
  async create(@Body() dto: CreateSamDto): Promise<Sam> {
    return await this.samService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  //? dryrun
  @SamDryRunDocs()
  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateSamDto): Promise<Sam | null> {
    return await this.samService.dryRun(dto);
  }

  //? 학교에 속한 강사(쌤)의 상세 정보 조회
  @GetSamByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Sam> {
    return await this.samService.findById(id, ['instructor', 'documents']);
  }

  //? 학교에 속한 강사(쌤)이 수강중인 group(강좌) 리스트
  @GetSamGroupsDocs()
  @Get(':id/groups')
  async groups(@Param('id', ParseIntPipe) id: number): Promise<Group[]> {
    return await this.samService.groups(id);
  }

  //? 학교에 속한 강사(쌤)의 강의 일정 조회 ( 주단위 )
  @SamScheduleFindByIdDocs()
  @Get(':id/schedule')
  async findBySchedule(
    @Param('id', ParseIntPipe) id: number,
    @Query('dates', new ParseArrayPipe({ items: String, separator: ',' }))
    dates: string[],
  ) {
    return await this.samService.findBySchedule(id, dates);
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

  @SoftDeleteSamDocs()
  @Delete(':id')
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeleteSamNoteDto,
  ): Promise<void> {
    return await this.samService.softDelete(id, dto);
  }
}
