import { PartialType } from '@nestjs/swagger';
import { CreateNotifiableDto } from './create-notifiable.dto';

export class UpdateNotifiableDto extends PartialType(CreateNotifiableDto) {}

