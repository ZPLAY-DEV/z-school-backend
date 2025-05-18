import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { BookingStatus, EnrollmentRule } from 'src/common/enums';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID of the offering', example: 1 })
  @IsInt()
  offeringId: number;

  @ApiProperty({ description: 'ID of the student', example: 1 })
  @IsInt()
  studentId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '💡 entity 에 존재하지 않지만 신청 로직에서 반드시 필요.',
    example: 18,
  })
  @IsInt()
  capacity: number;

  @ApiProperty({
    description: '💡 entity 에 존재하지 않지만 신청 로직에서 반드시 필요.',
    example: EnrollmentRule.FIRST,
  })
  @IsEnum(EnrollmentRule)
  enrollmentRule: EnrollmentRule;

  @ApiProperty({ description: '수강신청 과목명', example: '마인드크래프트' })
  @IsString()
  lessonName: string;

  @ApiProperty({
    description: '재수강생 여부 (!)',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isFormerStudent?: boolean;

  @ApiProperty({ description: '대기순번' })
  @IsInt()
  @IsOptional()
  waitingPosition?: number;

  @ApiProperty({
    description: '수강신청 상태',
    default: BookingStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<CreateBookingDto>) {
    Object.assign(this, partial);
  }
}
