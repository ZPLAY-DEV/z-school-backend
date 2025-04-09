import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SendSmsDto {
  @ApiProperty({ description: 'phone' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'message body' })
  @IsString()
  body: string;
}
