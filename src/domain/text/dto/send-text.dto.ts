import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SendTextDto {
  @ApiProperty({ description: 'sender (e.g. "01012345678")' })
  @IsString()
  sender: string;

  @ApiProperty({ description: 'receiver (e.g. "01012345678")' })
  @IsString()
  receiver: string;

  @ApiProperty({ description: 'message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'dryrun flag (default: false)' })
  @IsBoolean()
  @IsOptional()
  dryrun?: boolean;
}
