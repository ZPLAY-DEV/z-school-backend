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
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { DeleteSamNoteDto } from 'src/domain/sam/dto/delete-sam-note.dto';
import { UpdateSamDto } from 'src/domain/sam/dto/update-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Document } from 'src/domain/document/entities/document.entity';
import { SamService } from 'src/domain/sam/sam.service';
import {
  CreateSamDocs,
  GetSamByIdDocs,
  GetSamGroupsDocs,
  SamDocumentsDocs,
  SamDryRunDocs,
  SoftDeleteSamDocs,
} from './swagger/sam.swagger.decorator';
import { Group } from '../group/entities/group.entity';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Sams ( 학교쌤; equivalent to Student )')
@ApiCommonErrorResponseTemplate()
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

  @SamDryRunDocs()
  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateSamDto): Promise<Sam | null> {
    return await this.samService.dryRun(dto);
  }

  @GetSamByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Sam> {
    return await this.samService.findById(id, ['instructor', 'documents']);
  }

  @GetSamGroupsDocs()
  @Get(':id/groups')
  async groups(@Param('id', ParseIntPipe) id: number): Promise<Group[]> {
    return await this.samService.groups(id);
  }

  @SamDocumentsDocs()
  @Get(':id/documents')
  async getDocuments(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Document[]> {
    return await this.samService.getDocuments(id);
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
