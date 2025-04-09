import { PartialType } from '@nestjs/mapped-types';
import { CreateCalendarDto } from 'src/domain/calendar/dto/create-calendar.dto';

export class UpdateCalendarDto extends PartialType(CreateCalendarDto) {}
