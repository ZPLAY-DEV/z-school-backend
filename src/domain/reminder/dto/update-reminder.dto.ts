import { PartialType } from '@nestjs/swagger';
import { CreateReminderDto } from 'src/domain/reminder/dto/create-reminder.dto';

export class UpdateReminderDto extends PartialType(CreateReminderDto) {}
