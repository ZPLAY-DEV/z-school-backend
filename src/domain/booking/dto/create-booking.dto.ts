import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID of the offering' })
  @IsInt()
  offeringId: number;

  @ApiProperty({ description: 'ID of the student' })
  @IsInt()
  studentId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '수강신청 과목명' })
  @IsString()
  @IsOptional()
  lessonName?: string;

  @ApiProperty({ description: '수강생정원' })
  @IsInt()
  capacity: number;

  @ApiProperty({
    description: '재수강생 여부 (!)',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isFormerStudent?: boolean;

  @ApiProperty({
    description: '수강확정 여부',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isEnrolled?: boolean;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<CreateBookingDto>) {
    Object.assign(this, partial);
  }
}
