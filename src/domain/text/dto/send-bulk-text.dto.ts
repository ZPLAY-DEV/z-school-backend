import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class BulkMessage {
  @ApiProperty({ description: 'receiver (e.g. "01012345678")' })
  @IsString()
  receiver: string;

  @ApiProperty({ description: 'message' })
  @IsString()
  message: string;
}

export class SendBulkTextDto {
  @ApiProperty({ description: 'sender (e.g. "01012345678")' })
  @IsString()
  sender: string;

  @ApiProperty({ description: 'bulk sms messages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMessage)
  messages: BulkMessage[];

  @ApiProperty({ description: 'dryrun flag (default: false)' })
  @IsBoolean()
  @IsOptional()
  dryrun?: boolean;
}
