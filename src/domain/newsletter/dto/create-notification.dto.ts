import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';
import { IFcmData } from 'src/common/interfaces';

export class CreateNotificationDto {
  @ApiProperty({
    description: '🈵 newsletterId',
    example: 1,
  })
  @IsInt()
  newsletterId: number;

  @ApiProperty({
    description: '🈵 전화번호',
    example: '01012345678',
    maxLength: 16,
  })
  @IsString()
  @MaxLength(16)
  phone: string;

  @ApiProperty({
    description: '🈵 FCM 토큰',
    example: 'fcm_token_string',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  token?: string | null;

  @ApiProperty({
    description: '🈵 알림 제목',
    example: '새로운 공지사항이 있습니다',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: '🈵 알림 본문',
    example: '자세한 내용을 확인해주세요',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  body: string;

  @ApiProperty({
    description: '🈵 notification service 에 전달할 payload',
    example: {
      type: 'newsletter',
      schoolId: 1,
      role: 'parent',
      messages: [],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: IFcmData | null;
}
