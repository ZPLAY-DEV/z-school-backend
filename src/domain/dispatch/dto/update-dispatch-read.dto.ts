import { PartialType } from '@nestjs/swagger';
import { CreateDispatchReadDto } from './create-dispatch-read.dto';

export class UpdateDispatchReadDto extends PartialType(CreateDispatchReadDto) {}
