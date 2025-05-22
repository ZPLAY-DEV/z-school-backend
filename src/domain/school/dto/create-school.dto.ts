import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Permission, Region } from 'src/common/enums';
import { MessageType } from 'src/common/enums/message-type';

export class CreateSchoolDto {
  @ApiProperty({
    description: '🈳 School name',
    example: '제트학교',
    maxLength: 32,
    required: false,
  })
  @IsString()
  @Length(1, 32)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: '🈵 Unique school code',
    example: '212121',
    maxLength: 16,
  })
  @IsString()
  @Length(1, 16)
  @IsNotEmpty()
  schoolCode: string;

  @ApiProperty({
    description: '🈵 Unique school authority code',
    example: 'K14',
    maxLength: 16,
  })
  @IsString()
  @Length(1, 16)
  @IsNotEmpty()
  authorityCode?: string;

  @ApiProperty({
    description: '🈳 Region',
    example: Region.SEOUL,
    enum: Region,
    default: Region.SEOUL,
    required: false,
  })
  @IsEnum(Region)
  @IsOptional()
  region?: Region;

  @ApiProperty({
    description: '🈳 School address',
    example: '서울특별시 강남구 역삼동 123-45',
    maxLength: 64,
    required: false,
  })
  @IsString()
  @Length(1, 64)
  @IsOptional()
  address?: string;

  @ApiProperty({
    description:
      '🈳 Operation fee rule (CO: same cost without changes, MC/MF: calculated by ratio)',
    example: 'CO-1000',
    maxLength: 16,
    required: false,
  })
  @IsString()
  @Length(1, 16)
  @IsOptional()
  operationFeeRule?: string;

  @ApiProperty({
    description: '🈳 Payout rate percentage (0-100)',
    example: 100,
    default: 100,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  payoutRate?: number;

  @ApiProperty({
    description: '🈳 Allowed permissions',
    example: [Permission.ALLOW_INSTRUCTOR_ADD_STUDENT],
    required: false,
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  @IsOptional()
  permissions?: Permission[];

  @ApiProperty({
    description: '🈳 Promotional video URLs',
    example: ['https://cdn.z-school.com/xxxx'],
    required: false,
    type: [String],
  })
  @IsOptional()
  promos?: string[];

  @ApiProperty({
    description: '🈳 학교에서 지정한 발송 메시지 타입 ( ALL, SMS, FCM )',
    example: MessageType.ALL,
    enum: MessageType,
    default: MessageType.ALL,
    required: false,
  })
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;
}
