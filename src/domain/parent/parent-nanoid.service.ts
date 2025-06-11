import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { CreateNanoIdDto } from 'src/domain/parent/dto/create-nanoid.dto';
import { NanoId } from 'src/domain/parent/entities/nanoid.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { parseValidityToDate } from 'src/helpers/time';
import { Repository } from 'typeorm';

@Injectable()
export class ParentNanoIdService {
  private readonly logger = new Logger(ParentNanoIdService.name);

  constructor(
    @InjectRepository(NanoId)
    private readonly nanoIdRepository: Repository<NanoId>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateNanoIdDto): Promise<NanoId> {
    // parent 정보 조회
    const parent = await this.parentRepository.findOne({
      where: { id: dto.parentId },
    });

    if (!parent) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }

    // nanoid 생성
    const generatedNanoId = nanoid();
    const expiresAt = parseValidityToDate(dto.validity);

    this.logger.log(`Generated nanoId: ${generatedNanoId}`);

    await this.nanoIdRepository.upsert(
      {
        parentId: dto.parentId,
        nanoid: generatedNanoId,
        phone: parent.phone,
        target: dto.target,
        targetArgs: dto.targetArgs,
        expiresAt: expiresAt,
      },
      ['parentId', 'target', 'targetArgs'],
    );

    // upsert 후 결과 조회 시 unique constraint 조합으로 정확히 조회
    const savedNanoId = await this.nanoIdRepository.findOne({
      where: {
        parentId: dto.parentId,
        target: dto.target,
        targetArgs: dto.targetArgs,
      },
    });

    if (!savedNanoId) {
      throw new Error('Failed to create or update NanoId');
    }

    return savedNanoId;
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
