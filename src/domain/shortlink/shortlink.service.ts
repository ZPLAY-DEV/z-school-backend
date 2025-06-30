import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { Repository } from 'typeorm';
@Injectable()
export class ShortlinkService {
  private readonly logger = new Logger(ShortlinkService.name);

  constructor(
    @InjectRepository(Shortlink)
    private readonly shortlinkRepository: Repository<Shortlink>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async list(): Promise<Shortlink[]> {
    return await this.shortlinkRepository.find();
  }

  async findById(id: number, relations: string[] = []): Promise<Shortlink> {
    try {
      return relations.length > 0
        ? await this.shortlinkRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.shortlinkRepository.findOneOrFail({
            where: { id },
          });
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException('Shortlink not found');
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  // this is hard-delete
  async remove(id: number): Promise<Shortlink> {
    const sam = await this.findById(id);
    await this.shortlinkRepository.softRemove(sam);
    return sam;
  }
}
