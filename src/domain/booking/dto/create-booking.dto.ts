import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID of the offering' })
  @IsInt()
  offeringId: number;

  @ApiProperty({ description: 'ID of the student' })
  @IsInt()
  studentId: number;

  @ApiProperty({
    description: 'Preferred booking status',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;

  @ApiProperty({
    description: 'Enrollment confirmation status',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isEnrolled?: boolean;

  constructor(partial: Partial<CreateBookingDto>) {
    Object.assign(this, partial);
  }
}
