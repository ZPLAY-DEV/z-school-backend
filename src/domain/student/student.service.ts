import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { S3Service } from 'src/services/aws/s3.service';
import { Not, Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly s3Service: S3Service,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  async create(dto: CreateStudentDto): Promise<Student> {
    const { parent: parentDto, ...studentDto } = dto;

    let parentId: number | undefined;

    if (parentDto?.phone) {
      let parent = await this.parentRepository.findOne({
        where: { phone: parentDto.phone },
      });
      if (!parent) {
        parent = await this.parentRepository.save({
          ...parentDto,
        });
      }
      parentId = parent.id;
    }

    // 3. 학생 존재 여부 확인
    const existingStudent = await this.studentRepository.findOne({
      where: {
        schoolId: studentDto.schoolId,
        grade: studentDto.grade,
        class: studentDto.class,
        studentCode: studentDto.studentCode,
      },
    });

    if (existingStudent) {
      const updatedStudent = this.studentRepository.merge(existingStudent, {
        ...studentDto,
        parentId,
      });
      return this.studentRepository.save(updatedStudent);
    } else {
      const newStudent = this.studentRepository.create({
        ...studentDto,
        parentId,
      });
      return this.studentRepository.save(newStudent);
    }
  }

  //? upsert 여부 조회
  async dryRun(dto: CreateStudentDto): Promise<Student | null> {
    // In dryRun mode, we check if the student exists but don't create it
    const existingStudent = await this.studentRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        grade: dto.grade,
        class: dto.class,
        studentCode: dto.studentCode,
      },
    });

    return existingStudent ? existingStudent : null;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  //? 학생 상세 정보 조회
  async findById(id: number): Promise<Student> {
    const student = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.picks', 'picks')
      .where('student.id = :id', { id })
      .getOne();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  //? 학생의 수강중인 반 조회
  async findGroupsById(id: number, termId?: number): Promise<Group[]> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['picks', 'picks.group', 'picks.group.lesson'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    let picks = student.picks;
    if (termId) {
      picks = picks.filter((pick) => pick.termId === Number(termId));
    }

    // Pick에서 Group 추출
    return picks.map((pick) => pick.group).filter(Boolean);
  }

  //? 학생의 취소한 반 조회
  async findCanceledGroupsById(id: number, termId?: number): Promise<Group[]> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['picks', 'picks.group', 'picks.group.lesson'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    let picks = student.picks;
    picks = termId
      ? picks.filter((pick) => !!pick.endedBy && pick.termId === Number(termId))
      : picks.filter((pick) => !!pick.endedBy);

    // Pick에서 Group 추출
    return picks.map((pick) => pick.group).filter(Boolean);
  }

  //? 학생의 수강 신청 내역 조회
  async findBookingsById(id: number, termId?: number): Promise<Booking[]> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.offering', 'offering')
      .where('booking.studentId = :studentId', { studentId: id });

    // termId가 제공되면 해당 학기의 booking만 필터링
    if (termId) {
      queryBuilder.andWhere('offering.termId = :termId', {
        termId: Number(termId),
      });
    }

    return await queryBuilder.getMany();
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    const existingStudent = await this.studentRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        grade: dto.grade,
        class: dto.class,
        studentCode: dto.studentCode,
        id: Not(id),
      },
    });

    if (existingStudent) {
      throw new ConflictException('Student already exists');
    }

    const student = await this.studentRepository.preload({ id, ...dto });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return await this.studentRepository.save(student);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async remove(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return await this.studentRepository.softRemove(student);
  }

  // note that this is hard-delete
  async deleteImages(url: string): Promise<void> {
    await this.s3Service.delete(url);
  }
}
