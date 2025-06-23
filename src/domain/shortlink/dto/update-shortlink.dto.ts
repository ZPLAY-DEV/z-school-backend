import { PartialType } from '@nestjs/mapped-types';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';

export class UpdateSamDto extends PartialType(CreateSamDto) {}
