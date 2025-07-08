import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreateLateBookingDto {
  @ApiProperty({ description: 'ID of the offering', example: 1 })
  @IsInt()
  offeringId: number;

  @ApiProperty({ description: 'ID of the student', example: 1 })
  @IsInt()
  studentId: number;

  @ApiProperty({ description: '수강신청 과목명', example: '마인드크래프트' })
  @IsString()
  lessonName: string;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<CreateLateBookingDto>) {
    Object.assign(this, partial);
  }
}
