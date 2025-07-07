import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Group } from 'src/domain/group/entities/group.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { S3Service } from 'src/services/aws/s3.service';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly s3Service: S3Service,
    private readonly dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  //! somehow we prefer to use upsert instead of create
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

    let savedStudent: Student;

    if (existingStudent) {
      const updatedStudent = this.studentRepository.merge(existingStudent, {
        ...studentDto,
        parentId,
      });
      savedStudent = await this.studentRepository.save(updatedStudent);
    } else {
      const newStudent = this.studentRepository.create({
        ...studentDto,
        parentId,
      });
      savedStudent = await this.studentRepository.save(newStudent);
    }

    // parent 정보와 함께 리턴
    return await this.studentRepository.findOneOrFail({
      where: { id: savedStudent.id },
      relations: ['parent'],
    });
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
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .where('student.id = :id', { id })
      .getOne();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  //? 학생의 수업일 조회
  async findSchooldaysById(id: number, termId?: number): Promise<Schoolday[]> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .leftJoinAndSelect('group.schooldays', 'schoolday')
      .where('student.id = :id', { id })
      .andWhere('pick.endedBy IS NULL'); // 현재 수강중인 반만 조회

    // termId가 제공되면 해당 학기의 picks만 필터링
    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    const student = await queryBuilder.getOne();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 학생의 picks에서 모든 schooldays 추출
    const schooldays: Schoolday[] = [];
    student.picks.forEach((pick) => {
      if (pick.group && pick.group.schooldays) {
        schooldays.push(...pick.group.schooldays);
      }
    });

    // 중복 제거 (같은 schoolday가 여러 group에 있을 수 있다면...)
    // const uniqueSchooldays = schooldays.filter(
    //   (schoolday, index, self) =>
    //     index === self.findIndex((s) => s.id === schoolday.id),
    // );

    return schooldays;
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

  //? 학생의 수강중인 반 조회
  async listGroups(id: number, termId?: number): Promise<Group[]> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.picks', 'pick')
      .leftJoinAndSelect('pick.group', 'group')
      .where('student.id = :id', { id })
      .andWhere('pick.endedBy IS NULL');

    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    return await queryBuilder.getMany();
  }

  //? 학생의 수강중인 반 조회 (페이지네이션)
  async infiniteListGroups(
    id: number,
    query: PaginateQuery,
    termId?: number,
  ): Promise<Paginated<Group>> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .leftJoinAndSelect('pick.student', 'student')
      .where('student.id = :id', { id })
      .andWhere('pick.endedBy IS NULL');

    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'] as const,
      searchableColumns: ['groupName'] as const,
      defaultSortBy: [['id', 'ASC']],
    });

    return result;
  }

  //? 학생의 취소한 반 조회
  async listCanceledGroups(id: number, termId?: number): Promise<Group[]> {
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

  //? 학생의 취소한 반 조회 (페이지네이션)
  async infiniteListCanceledGroups(
    id: number,
    query: PaginateQuery,
    termId?: number,
  ): Promise<Paginated<Group>> {
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.picks', 'pick')
      .leftJoinAndSelect('pick.student', 'student')
      .where('student.id = :id', { id })
      .andWhere('pick.endedBy IS NOT NULL');

    if (termId) {
      queryBuilder.andWhere('pick.termId = :termId', {
        termId: Number(termId),
      });
    }

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'] as const,
      searchableColumns: ['groupName'] as const,
      defaultSortBy: [['id', 'ASC']],
    });

    return result;
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 중복 체크 (자신 제외)
      if (dto.schoolId && dto.grade && dto.class && dto.studentCode) {
        const existingStudent = await manager.findOne(Student, {
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
      }

      // 1. Student 존재 여부 확인
      const existingStudent = await manager.findOne(Student, {
        where: { id },
        relations: ['parent'],
      });

      if (!existingStudent) {
        throw new NotFoundException('Student not found');
      }

      // 2. parent 정보가 있으면 업데이트
      if (dto.parent && existingStudent.parentId) {
        await manager.update(
          Parent,
          { id: existingStudent.parentId },
          dto.parent,
        );
      }

      // 3. Student 정보 업데이트 (parent 정보 제외)
      const studentUpdateData = {
        parentId: dto.parentId,
        schoolId: dto.schoolId,
        grade: dto.grade,
        class: dto.class,
        studentCode: dto.studentCode,
        name: dto.name,
        phone: dto.phone,
        escortPhone: dto.escortPhone,
        homeTransit: dto.homeTransit,
        nextStop: dto.nextStop,
        status: dto.status,
        note: dto.note,
      };

      const student = await manager.preload(Student, {
        id,
        ...studentUpdateData,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      await manager.save(Student, student);

      // 4. 업데이트된 Student 조회 및 반환
      return await manager.findOneOrFail(Student, {
        where: { id },
        relations: ['parent'],
      });
    });
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
