import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventStatus } from 'src/common/enums';

export class CreateEventDto {
  @ApiProperty({
    description: '이벤트 상태 (partition key)',
    enum: EventStatus,
    example: EventStatus.PENDING,
  })
  @IsEnum(EventStatus)
  @IsNotEmpty()
  status: EventStatus;

  @ApiProperty({
    description: '날짜 키 (sort key)',
    example: 'DATE#2025-01-15T10:00:00Z#ID#123',
  })
  @IsString()
  @IsNotEmpty()
  dateKey: string;

  @ApiProperty({
    description: '이벤트 타입',
    example: 'EVERYDAY@2AM',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: '이벤트 페이로드 (임의의 객체)',
    example: { userId: 1, message: 'Hello World' },
  })
  @IsObject()
  @IsNotEmpty()
  payload: any;

  @ApiProperty({
    description: 'TTL (Time To Live) - 만료 시간 (초 단위)',
    required: false,
    example: 1735689600,
  })
  @IsNumber()
  @IsOptional()
  expires?: number;
}
