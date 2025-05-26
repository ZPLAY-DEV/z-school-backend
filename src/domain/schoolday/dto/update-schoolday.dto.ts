import { PartialType } from '@nestjs/mapped-types';
import { CreateSchooldayDto } from 'src/domain/schoolday/dto/create-schoolday.dto';

export class UpdateSchooldayDto extends PartialType(CreateSchooldayDto) {}
