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
        nanoId: generatedNanoId,
        phone: parent.phone,
        expiresAt: expiresAt,
      },
      {
        conflictPaths: ['parentId'], // parentId가 unique이므로 충돌 기준
        skipUpdateIfNoValuesChanged: false, // 값이 같아도 업데이트 (새로운 nanoId와 expiresAt 때문)
      },
    );

    // upsert 후 결과 조회하여 반환
    const savedNanoId = await this.nanoIdRepository.findOne({
      where: { parentId: dto.parentId },
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
