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
import { ApiTags } from '@nestjs/swagger';

import { Group } from 'src/domain/group/entities/group.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { DeleteSamNoteDto } from 'src/domain/sam/dto/delete-sam-note.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SamService } from 'src/domain/sam/sam.service';

@ApiTags('✅ Sams ( 학교쌤 ≓ Student )')
@Controller('sams')
@UseInterceptors(ClassSerializerInterceptor)
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

  //? 학교쌤의 상세 정보 조회
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Sam> {
    return await this.samService.findById(id, [
      'instructor',
      'contracts',
      'contracts.group',
      'contracts.lesson',
    ]);
  }

  //? 학교쌤이 가르치는 반 리스트
  @Get(':id/groups')
  async findGroupsById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Group[]> {
    return await this.samService.findGroupsById(id);
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
