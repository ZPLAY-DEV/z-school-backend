import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolDto } from 'src/domain/school/dto/create-school.dto';

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {}
