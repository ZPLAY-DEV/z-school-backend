import { PartialType } from '@nestjs/mapped-types';
import { CreateParentDto } from 'src/domain/parent/dto/create-parent.dto';

export class UpdateParentDto extends PartialType(CreateParentDto) {}
