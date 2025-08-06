import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateHistoryDto {
  @ApiProperty({ description: '학생 ID', example: 1 })
  @IsInt()
  @Min(1)
  schoolId: number;

  @ApiProperty({ description: '과목 ID', example: 1 })
  @IsInt()
  @Min(1)
  termId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'sms Id', required: false })
  @IsString()
  @IsOptional()
  smsId?: string;

  @ApiProperty({ description: 'fcm Id', required: false })
  @IsString()
  @IsOptional()
  fcmId?: string;

  @ApiProperty({ description: 'kakao Id', required: false })
  @IsString()
  @IsOptional()
  kakaoId?: string;

  @ApiProperty({ description: 'message count', example: 0 })
  @IsInt()
  @Min(0)
  smsCount: number;

  @ApiProperty({ description: 'message count', example: 0 })
  @IsInt()
  @Min(0)
  fcmCount: number;

  @ApiProperty({ description: 'message count', example: 0 })
  @IsInt()
  @Min(0)
  kakaoCount: number;

  @ApiProperty({ description: 'total message count', example: 0 })
  @IsInt()
  @Min(0)
  total: number;

  @ApiProperty({
    description: '🈳 비고',
    example: '입력한 참고사항',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<CreateHistoryDto>) {
    Object.assign(this, partial);
  }
}
