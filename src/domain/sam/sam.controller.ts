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

import { Group } from 'src/domain/group/entities/group.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SamService } from 'src/domain/sam/sam.service';
import {
  CreateSamDocs,
  GetSamByIdDocs,
  GetSamGroupsDocs,
  SamDryRunDocs,
  SoftDeleteSamDocs,
  UpdateSamDocs,
} from 'src/domain/sam/swagger/sam.swagger.decorator';

@ApiTags('✅ Sams ( 학교쌤 ≓ Student )')
@Controller('sams')
@UseInterceptors(ClassSerializerInterceptor)
export class SamController {
  constructor(private readonly samService: SamService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  // todo. see if it works
  @CreateSamDocs()
  @ApiOperation({ description: '학교쌤(Sam) 생성' })
  @Post()
  async create(@Body() dto: CreateSamDto): Promise<Sam> {
    return await this.samService.create(dto);
  }

  @SamDryRunDocs()
  @ApiOperation({ description: '학교쌤(Sam) 생성 dryRun 체크' })
  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateSamDto): Promise<Sam | null> {
    return await this.samService.dryRun(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetSamByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Sam> {
    return await this.samService.findById(id, [
      'instructor',
      'contracts',
      'contracts.group',
      'contracts.lesson',
    ]);
  }

  @GetSamGroupsDocs()
  @Get(':id/groups')
  async findGroupsById(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
  ): Promise<Group[]> {
    return await this.samService.findGroupsById(id, termId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

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
