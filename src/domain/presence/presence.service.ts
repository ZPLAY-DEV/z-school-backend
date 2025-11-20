import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { CreatePresenceDto } from 'src/domain/presence/dto/create-presence.dto';
import { UpdatePresenceDto } from 'src/domain/presence/dto/update-presence.dto';
import { Presence } from 'src/domain/presence/entities/presence.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
  ) {}

  async listByPick(pickId: number): Promise<Presence[]> {
    await this._ensurePickExists(pickId);
    return await this.presenceRepository.find({
      where: { pickId },
      order: { weekNumber: 'ASC', lessonDate: 'ASC' },
    });
  }

  async create(pickId: number, dto: CreatePresenceDto): Promise<Presence> {
    await this._ensurePickExists(pickId);
    const entity = this.presenceRepository.create({
      ...dto,
      pickId,
    });
    return await this.presenceRepository.save(entity);
  }

  async update(
    pickId: number,
    presenceId: number,
    dto: UpdatePresenceDto,
  ): Promise<Presence> {
    const presence = await this._findOneOrFail(pickId, presenceId);
    Object.assign(presence, dto);
    return await this.presenceRepository.save(presence);
  }

  async remove(pickId: number, presenceId: number): Promise<Presence> {
    const presence = await this._findOneOrFail(pickId, presenceId);
    return await this.presenceRepository.softRemove(presence);
  }

  private async _ensurePickExists(pickId: number): Promise<void> {
    const pickExists = await this.pickRepository.exist({
      where: { id: pickId },
    });

    if (!pickExists) {
      throw new NotFoundException(
        `pickId ${pickId}에 해당하는 Pick이 없습니다`,
      );
    }
  }

  private async _findOneOrFail(
    pickId: number,
    presenceId: number,
  ): Promise<Presence> {
    const presence = await this.presenceRepository.findOne({
      where: { id: presenceId, pickId },
    });

    if (!presence) {
      throw new NotFoundException(
        `pickId ${pickId} 하위에서 presenceId ${presenceId}를 찾을 수 없습니다`,
      );
    }

    return presence;
  }
}
