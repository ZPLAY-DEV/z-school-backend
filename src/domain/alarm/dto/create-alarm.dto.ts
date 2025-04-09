import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { AlarmType } from 'src/common/enums';
import { IData } from 'src/common/interfaces';
import { ISender } from 'src/domain/alarm/entities/alarm.interface';

export class CreateAlarmDto {
  @ApiProperty({ description: '🈵 사용자 id', required: true })
  @IsNumber()
  userId: number;

  // 빈칸으로 남겨두면 자동생성
  @ApiProperty({
    description: '🈳 메시지 id (msg_xxxxxx_userId)',
    required: false,
  })
  @IsString()
  @IsOptional()
  id: string;

  @ApiProperty({
    description: '🈵 type',
    default: AlarmType.GENERAL,
    required: true,
  })
  @IsEnum(AlarmType)
  alarmType: AlarmType;

  @ApiProperty({ description: '🈵 message', required: true })
  @IsString()
  @IsOptional()
  message: string;

  @ApiProperty({ description: '🈵 data (navigation 용)', required: true })
  @IsObject()
  @IsOptional()
  data: IData | null;

  @ApiProperty({ description: '🈳 link (navigation 용)' })
  @IsString()
  @IsOptional()
  link: string | null;

  @ApiProperty({ description: '🈳 사용자' })
  @IsObject()
  @IsOptional()
  user: ISender | null;

  @ApiProperty({ description: '🈳 읽음 여부' })
  @IsBoolean()
  @IsOptional()
  isRead: boolean;

  // 빈칸으로 남겨두면 자동생성
  @ApiProperty({
    description: '🈳 ttl',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  expires: number;
}
