import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';
import { Departure } from './entities/departure.entity';

@Injectable()
export class DepartureService {
  constructor(
    @InjectRepository(Departure)
    private readonly departureRepository: Repository<Departure>,
  ) {}

  async create(createDepartureDto: CreateDepartureDto): Promise<Departure> {
    try {
      const departure = this.departureRepository.create({
        ...createDepartureDto,
        departuredAt: new Date(createDepartureDto.departuredAt),
      });

      return await this.departureRepository.save(departure);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException(
          '해당 학생의 수업에 대한 하교 기록이 이미 존재합니다.',
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<Departure[]> {
    return await this.departureRepository.find({
      relations: ['student', 'schoolday'],
      order: { departuredAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Departure> {
    const departure = await this.departureRepository.findOne({
      where: { id },
      relations: ['student', 'schoolday'],
    });

    if (!departure) {
      throw new NotFoundException(`Departure with ID ${id} not found`);
    }

    return departure;
  }

  async findByStudent(studentId: number): Promise<Departure[]> {
    return await this.departureRepository.find({
      where: { studentId },
      relations: ['student', 'schoolday'],
      order: { departuredAt: 'DESC' },
    });
  }

  async findByDate(date: string): Promise<Departure[]> {
    return await this.departureRepository
      .createQueryBuilder('departure')
      .leftJoinAndSelect('departure.student', 'student')
      .leftJoinAndSelect('departure.schoolday', 'schoolday')
      .where('DATE(departure.departuredAt) = :date', { date })
      .orderBy('departure.departuredAt', 'DESC')
      .getMany();
  }

  async update(
    id: number,
    updateDepartureDto: UpdateDepartureDto,
  ): Promise<Departure> {
    const departure = await this.findOne(id);

    if (updateDepartureDto.departuredAt) {
      departure.departuredAt = new Date(updateDepartureDto.departuredAt);
    }

    if (updateDepartureDto.note !== undefined) {
      departure.note = updateDepartureDto.note;
    }

    return await this.departureRepository.save(departure);
  }

  async remove(id: number): Promise<void> {
    const departure = await this.findOne(id);
    await this.departureRepository.remove(departure);
  }
}
