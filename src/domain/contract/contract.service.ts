import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Actor } from 'src/common/enums';
import {
  CreateContractDto,
  EndContractDto,
} from 'src/domain/contract/dto/create-contract.dto';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { Repository } from 'typeorm';
import { UpdateGroupDto } from '../group/dto/update-group.dto';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  // 필수항목) groupId, samId, startedOn, note (수동으로 등록시)
  async createContract(dto: CreateContractDto): Promise<Contract> {
    const existingContract = await this.findContractByGroupIdAndSamId(
      dto.groupId,
      dto.samId,
    );
    if (existingContract) {
      throw new BadRequestException('already exists');
    }

    const contract = this.contractRepository.create(dto);
    return await this.contractRepository.save(contract);
  }

  async endContract(dto: EndContractDto): Promise<Contract> {
    const contract = await this.findContractByGroupIdAndSamId(
      dto.groupId,
      dto.samId,
    );
    if (!contract) {
      throw new NotFoundException('not found');
    }
    await this.contractRepository.update(contract.id, {
      note: dto.note,
      endedBy: dto.endedBy,
      endedOn: dto.endedOn,
    });

    contract.note = dto.note;
    contract.endedBy = dto.endedBy ?? Actor.OTHER;
    contract.endedOn = dto.endedOn;

    return contract;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async findContractByGroupIdAndSamId(
    groupId: number,
    samId: number,
  ): Promise<Contract> {
    return await this.contractRepository.findOneOrFail({
      where: { groupId, samId },
    });
  }

  async listSams(lessonId: number): Promise<Contract[]> {
    return await this.contractRepository.find({
      where: { lessonId },
      relations: ['sam', 'sam.instructor'],
    });
  }

  async infiniteListSams(
    lessonId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Contract>> {
    const queryBuilder = this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.lessonId = :lessonId', { lessonId });

    return await paginate(query, queryBuilder, {
      relations: {
        sam: {
          instructor: true,
        },
      },
      sortableColumns: ['id'],
      searchableColumns: ['note'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        enrolledBy: [FilterOperator.EQ],
        deletedBy: [FilterOperator.EQ],
      },
    });
  }

  async listGroups(samId: number): Promise<Contract[]> {
    return await this.contractRepository.find({
      where: { samId },
      relations: ['group', 'group.lesson'],
    });
  }

  async infiniteListGroups(
    samId: number,
    query: PaginateQuery,
  ): Promise<Paginated<Contract>> {
    const queryBuilder = this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.samId = :samId', { samId });

    return await paginate(query, queryBuilder, {
      relations: {
        group: {
          lesson: true,
        },
      },
      sortableColumns: ['id'],
      searchableColumns: ['note'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        enrolledBy: [FilterOperator.EQ],
        deletedBy: [FilterOperator.EQ],
      },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateGroupDto): Promise<Contract> {
    const group = await this.contractRepository.preload({
      id,
      ...dto,
    });
    if (!group) {
      throw new NotFoundException(`Contract not found`);
    }
    return await this.contractRepository.save(group);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<Contract> {
    const contract = await this.contractRepository.findOneOrFail({
      where: { id },
    });
    await this.contractRepository.softRemove(contract);
    return contract;
  }
}
