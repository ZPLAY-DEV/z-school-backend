import { PickType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentStatusDto extends PickType(CreateStudentDto, [
  'status',
] as const) {}
