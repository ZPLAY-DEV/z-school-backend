import { PartialType } from '@nestjs/swagger';
import { CreateAttendanceDto } from 'src/domain/attendance/dto/create-attendance.dto';

export class UpdateAttendanceDto extends PartialType(CreateAttendanceDto) {}
