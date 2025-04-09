import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
export class EmailCodeDto {
  @ApiProperty({ description: '이메일확인코드' })
  @IsNotEmpty()
  code: string;
}
