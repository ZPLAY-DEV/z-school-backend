import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Document } from 'src/domain/document/entities/document.entity';
import { Repository } from 'typeorm';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateDocumentDto): Promise<Document> {
    const document = this.documentRepository.create(dto);
    return await this.documentRepository.save(document);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findById(id: number, relations: string[] = []): Promise<Document> {
    try {
      return relations.length > 0
        ? await this.documentRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.documentRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateDocumentDto): Promise<Document> {
    const document = await this.documentRepository.preload({
      id,
      ...dto,
    });
    if (!document) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.documentRepository.save(document);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<Document> {
    const document = await this.findById(id);
    return await this.documentRepository.remove(document);
  }
}
