import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { BookingStatus, PickRule } from 'src/common/enums';

export class CreateBookingDto {
  @ApiProperty({ description: 'school ID', example: 1 })
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: 'term ID', example: 1 })
  @IsInt()
  termId: number;

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
    example: PickRule.FIRST,
  })
  @IsEnum(PickRule)
  pickRule: PickRule;

  @ApiProperty({ description: '수강신청 과목명', example: '마인드크래프트' })
  @IsString()
  lessonName: string;

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
