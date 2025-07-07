import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationType } from 'src/common/enums/notification-type';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { NotificationService } from 'src/services/notification/notification.service';
import { Repository } from 'typeorm';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';
import { Departure } from './entities/departure.entity';

@Injectable()
export class DepartureService {
  constructor(
    @InjectRepository(Departure)
    private readonly departureRepository: Repository<Departure>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Schoolday)
    private readonly schooldayRepository: Repository<Schoolday>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateDepartureDto): Promise<Departure> {
    console.log(`🔥 dto`, JSON.stringify(dto, null, 2));

    try {
      const student = await this.studentRepository.findOne({
        where: { id: dto.studentId },
        relations: ['parent', 'parent.user'],
      });
      if (!student) {
        throw new NotFoundException('Student not found.');
      }

      const schoolday = await this.schooldayRepository.findOne({
        where: { id: dto.schooldayId },
      });
      if (!schoolday) {
        throw new NotFoundException('Schoolday not found.');
      }

      const departure = this.departureRepository.create(dto);

      await this.notificationService.send({
        type: NotificationType.SCHOOL,
        schoolId: student.schoolId,
        role: 'PARENT',
        messages: [
          {
            id: student.parent.id,
            phone: student.parent.phone,
            token: student.parent.user?.pushToken ?? null,
            title: '하교 알림',
            body: `${student.name} 학생이 하교했습니다.`,
            role: 'PARENT',
          },
        ],
      });

      return await this.departureRepository.save(departure);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('A record already exists.');
      }
      throw error;
    }
  }

  async findAll(): Promise<Departure[]> {
    return await this.departureRepository.find({
      relations: ['student', 'schoolday'],
      order: { createdAt: 'DESC' },
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
      order: { id: 'DESC' },
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
