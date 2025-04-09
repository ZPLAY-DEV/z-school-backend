import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
export class UpdateStudentDto extends PartialType(CreateStudentDto) {}
