import { ApiProperty } from '@nestjs/swagger';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Student } from 'src/domain/student/entities/student.entity';

export class ResponseSchoolTermComboDto {
  @ApiProperty({ type: [Lesson] })
  lessons: Lesson[];

  @ApiProperty({ type: [Sam] })
  sams: Sam[];

  @ApiProperty({ type: [Student] })
  students: Student[];
}
