import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { CreateNanoidDto } from 'src/domain/parent/dto/create-nanoid.dto';
import { Nanoid } from 'src/domain/parent/entities/nanoid.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ParentNanoidService {
  private readonly logger = new Logger(ParentNanoidService.name);

  constructor(
    @InjectRepository(Nanoid)
    private readonly nanoidRepository: Repository<Nanoid>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateNanoidDto): Promise<Nanoid> {
    // parent 정보 조회
    const parent = await this.parentRepository.findOne({
      where: { id: dto.parentId },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    // nanoid 생성
    const generatedNanoid = nanoid();
    const expiresAt = dto.expiresAt;

    this.logger.log(`Generated nanoid: ${generatedNanoid}`);

    await this.nanoidRepository.upsert(
      {
        parentId: dto.parentId,
        nanoid: generatedNanoid,
        page: dto.page,
        args: dto.args,
        expiresAt: expiresAt,
      },
      ['parentId', 'page', 'args'],
    );

    // upsert 후 결과 조회 시 unique constraint 조합으로 정확히 조회
    const savedNanoid = await this.nanoidRepository.findOne({
      where: {
        parentId: dto.parentId,
        page: dto.page,
        args: dto.args,
      },
    });

    if (!savedNanoid) {
      throw new Error('Failed to create or update Nanoid');
    }

    return savedNanoid;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
}
