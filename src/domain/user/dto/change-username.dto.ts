import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';
export class ChangeUsernameDto {
  @ApiProperty({ description: '닉네임' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  username: string;

  @ApiProperty({ description: '변경비용' })
  @IsNumber()
  costToUpdate: number;
}
