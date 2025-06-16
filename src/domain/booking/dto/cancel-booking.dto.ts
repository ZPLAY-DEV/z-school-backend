import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString } from 'class-validator';
import { PickRule } from 'src/common/enums';

export class CancelBookingDto {
  @ApiProperty({ description: 'ID of the offering', example: 1 })
  @IsInt()
  offeringId: number;

  @ApiProperty({ description: 'ID of the student', example: 1 })
  @IsInt()
  studentId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '💡 entity 에 존재하지 않지만 신청 로직에서 반드시 필요.',
    example: PickRule.FIRST,
  })
  @IsEnum(PickRule)
  pickRule: PickRule;

  @ApiProperty({ description: '수강신청 과목명', example: '마인드크래프트' })
  @IsString()
  lessonName: string;

  @ApiProperty({
    description: '삭제하는 이유',
    example: '아이가 취소한대요.',
  })
  @IsString()
  note: string;

  constructor(partial: Partial<CancelBookingDto>) {
    Object.assign(this, partial);
  }
}
