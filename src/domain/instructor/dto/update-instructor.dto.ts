import { PartialType } from '@nestjs/mapped-types';
import { CreateInstructorDto } from 'src/domain/instructor/dto/create-instructor.dto';

export class UpdateInstructorDto extends PartialType(CreateInstructorDto) {}
