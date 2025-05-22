import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, Not, Repository } from 'typeorm';
import { School } from '../school/entities/school.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { BookingStatus } from 'src/common/enums';
import { Pick } from '../group/entities/pick.entity';
import { Booking } from '../booking/entities/booking.entity';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Pick)
    private readonly pickRepository: Repository<Pick>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private dataSource: DataSource,
    private readonly s3Service: S3Service,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//
  async create(dto: CreateStudentDto): Promise<Student> {
    const { parent: parentDto, ...studentDto } = dto;

    let parentId: number | undefined;

    // 1. 학교 존재 여부 확인
    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. 보호자 존재 여부 확인 ( upsert )
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

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

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

  //? 학생 목록 조회
  async findAll(query: PaginateQuery): Promise<Paginated<Student>> {
    const queryBuilder = this.studentRepository.createQueryBuilder('student');
    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        isActive: [FilterOperator.EQ],
        studentType: [FilterOperator.EQ],
      },
    });
  }

  //? 재학 학생 조회
  async findActive(): Promise<Student[]> {
    return await this.studentRepository
      .createQueryBuilder('student')
      .orderBy('student.id', 'DESC')
      .where({ isActive: true })
      .getMany();
  }

  //? 학생 상세 정보 조회
  async findById(id: number): Promise<Student> {
    const student = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parent', 'parent')
      .leftJoinAndSelect('student.groupStudents', 'groupStudents')
      .where('student.id = :id', { id })
      .getOne();

    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }

    return student;
  }

  //? 학생의 수업 형태에 따른 조회
  async findByIdWithStatus(id: number, status: BookingStatus): Promise<Pick[]> {
    switch (status) {
      case BookingStatus.ENROLLED:
        return await this.findEnrolledGroups(id);
      case BookingStatus.CANCELED:
        return await this.findCancelledGroups(id);
      default:
        throw new BadRequestException(
          HttpErrorConstants.STUDENT_COURSE_STATUS_NOT_FOUND,
        );
    }
  }

  //? 학생의 수강중인 강좌 조회
  async findEnrolledGroups(studentId: number): Promise<Pick[]> {
    const picks = await this.pickRepository
      .createQueryBuilder('pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.instructor', 'instructor')
      .leftJoinAndSelect('instructor.instructorSchools', 'instructorSchools')
      .where('pick.studentId = :studentId', { studentId })
      .getMany();

    return picks;
  }

  //? 학생의 수강취소 강좌 조회
  async findCancelledGroups(studentId: number): Promise<Pick[]> {
    const picks = await this.pickRepository
      .createQueryBuilder('pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.instructor', 'instructor')
      .leftJoinAndSelect('instructor.instructorSchools', 'instructorSchools')
      .where('pick.studentId = :studentId', { studentId })
      .andWhere('pick.deletedBy IS NOT NULL')
      .getMany();

    return picks;
  }

  // //? 학생의 수강 일정 조회
  // async findBySchedule(studentId: number, dates: string[]) {
  //   // const picks = await this.pickRepository
  //   //   .createQueryBuilder('pick')
  //   //   .leftJoinAndSelect('pick.group', 'group')
  //   //   .where('pick.studentId = :studentId', { studentId })
  //   //   .getMany();
  // }

  //? 학생의 수강 신청 내역 조회
  async findBookings(id: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: {
        studentId: id,
      },
      relations: ['offering'],
    });
  }
  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//
  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    // 1. 학교 존재 여부 확인
    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: dto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. Unique 제약 조건 확인 (학교-학년-반-번호) 기반
    const isStudent = await this.studentRepository.findOne({
      where: {
        schoolId: dto.schoolId,
        grade: dto.grade,
        class: dto.class,
        studentCode: dto.studentCode,
        id: Not(id),
      },
    });

    if (isStudent) {
      throw new ConflictException(HttpErrorConstants.CONFLICT_STUDENT);
    }

    const student = await this.studentRepository.preload({ id, ...dto });

    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_ENTITY);
    }

    return await this.studentRepository.save(student);
  }

  async updateStudentStatus(
    schoolId: number,
    studentId: number,
    dto: UpdateStudentStatusDto,
  ): Promise<Student> {
    // 1. 학교 존재 여부 확인
    const school = await this.dataSource.createEntityManager().findOne(School, {
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_SCHOOL);
    }

    // 2. 학생 존재 여부 확인
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_STUDENT);
    }

    // 3. 학생 상태 업데이트
    await this.studentRepository.save({
      ...student,
      status: dto.status,
    });

    return await this.studentRepository.findOneOrFail({
      where: { id: studentId },
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  // note that this is hard-delete
  async remove(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
    });
    if (!student) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_STUDENT);
    }
    return await this.studentRepository.remove(student);
  }

  // note that this is hard-delete
  async deleteImages(url: string): Promise<void> {
    await this.s3Service.delete(url);
  }
}
