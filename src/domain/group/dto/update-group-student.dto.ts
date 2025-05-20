import { PartialType } from '@nestjs/mapped-types';
import { CreatePickDto } from './create-group-student.dto';

export class UpdatePickDto extends PartialType(CreatePickDto) {}
