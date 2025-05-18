import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { BookingStatus } from 'src/common/enums';

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
  lessonName: string;

  @ApiProperty({
    description: '정원. entity 에 존재하지 않지만 redis 예약로직에서 필요.',
  })
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

  @ApiProperty({ description: 'milliseconds 단위의 timestamp for versioning' })
  @IsInt()
  @IsOptional()
  timestamp?: number;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<CreateBookingDto>) {
    Object.assign(this, partial);
  }
}
