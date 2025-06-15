import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from 'src/domain/event/dto/create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {}
