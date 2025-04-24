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
    description:
      'Check if this student has taken the lesson in the previous term',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isFormerStudent?: boolean;

  @ApiProperty({
    description: 'Whether or not this student is allowed to enroll',
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
