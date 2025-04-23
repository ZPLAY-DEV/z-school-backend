import { PartialType } from '@nestjs/swagger';
import { CreateBookingDto } from 'src/domain/booking/dto/create-booking.dto';
export class UpdateBookingDto extends PartialType(CreateBookingDto) {}
