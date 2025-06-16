import { ApiProperty } from '@nestjs/swagger';
import { PickResponseDto } from 'src/domain/pick/dto/pick-response.dto';
import { GroupResponseDto } from './group-response.dto';

export class GroupPickResponseDto extends GroupResponseDto {
  @ApiProperty({
    description: '반 학생 목록',
    type: PickResponseDto,
    isArray: true,
  })
  picks: PickResponseDto[];
}
