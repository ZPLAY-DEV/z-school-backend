import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { formatInTimeZone } from 'date-fns-tz';
import { NotificationSourceType } from 'src/common/enums';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { getTemplateOfDeparture } from 'src/helpers/get-message-body';
import { NotificationService } from 'src/services/notification/notification.service';
import { In, Repository } from 'typeorm';
import { CreateDepartureBulkDto } from './dto/create-departure-bulk.dto';
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
    try {
      // 학생을 조회
      const student = await this.studentRepository.findOne({
        where: { id: dto.studentId },
        relations: ['parent', 'parent.user', 'school'],
      });
      if (!student) {
        throw new NotFoundException('Student not found.');
      }

      // schoolday 조회
      const schoolday = await this.schooldayRepository.findOne({
        where: { id: dto.schooldayId },
      });
      if (!schoolday) {
        throw new NotFoundException('Schoolday not found.');
      }

      if (schoolday.today !== dto.date) {
        throw new BadRequestException('date does not match.');
      }

      // departure 생성
      const departure = this.departureRepository.create(dto);
      await this.departureRepository.save(departure);

      // 알림 발송
      const body = getTemplateOfDeparture({
        name: student?.name,
        school: student.school?.name,
        timestamp: `${formatInTimeZone(new Date(), 'Asia/Seoul', 'M월d일 H시m분')}`,
      });
      await this.notificationService.send({
        type: NotificationSourceType.OTHER,
        schoolId: student.schoolId,
        messages: [
          {
            token: student.parent.user?.pushToken ?? null,
            phone: student.parent.phone,
            template: 'Departure2',
            body: body,
            role: 'PARENT',
          },
        ],
      });

      return departure;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A record already exists.');
      }
      throw error;
    }
  }

  async createBulk(dto: CreateDepartureBulkDto): Promise<Departure[]> {
    // 학생들을 조회
    const students = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('parent.user', 'user')
      .leftJoinAndSelect('student.school', 'school')
      .where('student.id IN (:...studentIds)', { studentIds: dto.studentIds })
      .getMany();
    if (students.length !== dto.studentIds.length) {
      const foundIds = students.map((s) => s.id);
      const missingIds = dto.studentIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Students not found: ${missingIds.join(', ')}`,
      );
    }

    // schoolday 조회
    const schoolday = await this.schooldayRepository.findOne({
      where: { id: dto.schooldayId },
    });
    if (!schoolday) {
      throw new NotFoundException('Schoolday not found.');
    }
    if (schoolday.today !== dto.date) {
      throw new BadRequestException('date does not match.');
    }

    // 기존 departure 기록 확인
    const existingDepartures = await this.departureRepository.find({
      where: {
        studentId: In(dto.studentIds),
        schooldayId: dto.schooldayId,
        date: dto.date,
      },
    });

    const existingStudentIds = existingDepartures.map((d) => d.studentId);
    const newStudentIds = dto.studentIds.filter(
      (id) => !existingStudentIds.includes(id),
    );

    // 모든 학생이 이미 기록되어 있는 경우
    if (newStudentIds.length === 0) {
      throw new BadRequestException('Departure notification already sent.');
    }

    // 새로운 departure들 생성 (기록되지 않은 학생들만)
    const departures = newStudentIds.map((studentId) => {
      return this.departureRepository.create({
        studentId,
        schooldayId: dto.schooldayId,
        date: dto.date,
        note: dto.note,
      });
    });

    // DB에 저장
    const savedDepartures = await this.departureRepository.save(departures);

    // 알림 발송을 위한 메시지 준비 (새로 생성된 학생들만)
    const newStudents = students.filter((student) =>
      newStudentIds.includes(student.id),
    );
    const messages = newStudents.map((student) => {
      const body = getTemplateOfDeparture({
        name: student.name,
        school: student.school.name,
        timestamp: `${formatInTimeZone(new Date(), 'Asia/Seoul', 'M월d일 H시m분')}`,
      });
      return {
        token: student.parent.user?.pushToken ?? null,
        phone: student.parent.phone,
        template: 'Departure2',
        body: body,
        role: 'PARENT',
      };
    });

    // 알림 발송 (새로 생성된 학생들만)
    if (newStudents.length > 0) {
      await this.notificationService.send({
        type: NotificationSourceType.OTHER,
        schoolId: newStudents[0].schoolId,
        messages,
      });
    }

    return savedDepartures;
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
