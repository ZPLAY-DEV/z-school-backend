import { PartialType } from '@nestjs/swagger';
import { CreateAlarmDto } from 'src/domain/alarm/dto/create-alarm.dto';

export class UpdateAlarmDto extends PartialType(CreateAlarmDto) {}
