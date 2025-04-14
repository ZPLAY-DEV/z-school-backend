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
import { DocumentService } from 'src/domain/document/document.service';
import { CreateDocumentDto } from 'src/domain/document/dto/create-document.dto';
import { UpdateDocumentDto } from 'src/domain/document/dto/update-document.dto';
import { Document } from 'src/domain/document/entities/document.entity';
@UseInterceptors(ClassSerializerInterceptor)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Document 생성' })
  @Post()
  async create(@Body() dto: CreateDocumentDto): Promise<Document> {
    return await this.documentService.create({ ...dto });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Document 조회' })
  @Get(':id')
  async findById(@Param('id') id: number): Promise<Document> {
    return await this.documentService.findById(id, ['user', 'user.profile']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Document 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateDocumentDto,
  ): Promise<Document> {
    return await this.documentService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Document 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Document> {
    return await this.documentService.remove(id);
  }
}
