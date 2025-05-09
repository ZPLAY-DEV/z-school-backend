import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateInstructorDto } from 'src/domain/instructor/dto/create-instructor.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolInstructorService {
  private readonly logger = new Logger(SchoolInstructorService.name);

  constructor(
    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
  ) {}

  async create(
    schoolId: number,
    dto: CreateInstructorDto,
  ): Promise<Instructor> {
    // 1. Check if the school exists
    const school = await this.schoolRepository.findOne({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${schoolId} not found`);
    }

    // 2. Check if the instructor exists using compound key (name, phone)
    let instructor = await this.instructorRepository.findOne({
      where: [
        {
          name: dto.name,
          phone: dto.phone,
        },
      ],
    });

    // 3. If instructor exists, update it; otherwise, create a new one
    if (instructor) {
      // Update existing instructor
      await this.instructorRepository.update(
        { id: instructor.id },
        {
          userId: dto.userId,
          note: dto.note,
          pushToken: dto.pushToken,
        },
      );

      // Refresh instructor data
      instructor = await this.instructorRepository.findOne({
        where: { id: instructor.id },
      });
    } else {
      // Create new instructor
      instructor = await this.instructorRepository.save(
        new Instructor({
          userId: dto.userId,
          name: dto.name,
          phone: dto.phone,
          note: dto.note,
        }),
      );
    }

    // 4. Upsert instructor-school relationship
    await this.instructorRepository.manager.query(
      'INSERT IGNORE INTO `instructor_school` (instructorId, schoolId) VALUES (?, ?)',
      [instructor!.id, school.id],
    );

    return instructor!;
  }
}
