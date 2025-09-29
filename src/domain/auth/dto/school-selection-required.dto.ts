import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { SchoolInfo } from './school-info.dto';

export class SchoolSelectionRequiredDto {
  @ApiProperty({ description: '학교 선택이 필요한지 여부', example: true })
  @Expose()
  requiresSchoolSelection: boolean;

  @ApiProperty({ 
    description: '선택 가능한 학교 목록', 
    type: [SchoolInfo],
    example: [
      { id: 1, name: '서울초등학교', schoolCode: '7872025', region: 'SEOUL', address: '서울특별시 강남구 역삼동 123-45' },
      { id: 2, name: '부산초등학교', schoolCode: '7872026', region: 'BUSAN', address: '부산광역시 해운대구 우동 456-78' }
    ]
  })
  @Expose()
  availableSchools: SchoolInfo[];

  @ApiProperty({ description: '사용자에게 표시할 메시지', example: '다자녀 가정입니다. 학교를 선택해주세요.' })
  @Expose()
  message: string;
}
