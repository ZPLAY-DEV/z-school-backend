import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class SendBulkTextDto {
  @ApiProperty({ description: 'sender', example: '01012345678' })
  @IsString()
  sender: string;

  @ApiProperty({
    description: 'receiver phone numbers',
    example: ['01012345678', '01012345679'],
  })
  @IsArray()
  phones: string[];

  @ApiProperty({ description: 'message', example: 'Hello, world!' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'dryrun flag (default: false)', example: false })
  @IsBoolean()
  @IsOptional()
  dryrun?: boolean;
}
