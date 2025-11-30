import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { CreateScoreDto } from 'src/domain/score/dto/create-score.dto';
import { UpdateScoreDto } from 'src/domain/score/dto/update-score.dto';
import { Score } from 'src/domain/score/entities/score.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PickScoreService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
  ) {}

  async listByPick(pickId: number): Promise<Score[]> {
    await this._ensurePickExists(pickId);
    return await this.scoreRepository.find({
      where: { pickId },
      order: { weekNumber: 'ASC', lessonDate: 'ASC', id: 'ASC' },
    });
  }

  async create(pickId: number, dto: CreateScoreDto): Promise<Score> {
    await this._ensurePickExists(pickId);
    const entity: Score = this.scoreRepository.create({
      ...dto,
      pickId,
    });
    return await this.scoreRepository.save(entity);
  }

  async update(
    pickId: number,
    scoreId: number,
    dto: UpdateScoreDto,
  ): Promise<Score> {
    const score = await this._findOneOrFail(pickId, scoreId);
    Object.assign(score, dto);
    return await this.scoreRepository.save(score);
  }

  async remove(pickId: number, scoreId: number): Promise<Score> {
    const score = await this._findOneOrFail(pickId, scoreId);
    return await this.scoreRepository.softRemove(score);
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
    scoreId: number,
  ): Promise<Score> {
    const score = await this.scoreRepository.findOne({
      where: { id: scoreId, pickId },
    });

    if (!score) {
      throw new NotFoundException(
        `pickId ${pickId} 하위에서 scoreId ${scoreId}를 찾을 수 없습니다`,
      );
    }

    return score;
  }
}
