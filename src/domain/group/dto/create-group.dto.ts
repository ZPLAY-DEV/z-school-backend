import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ClassStatus, Weekday } from 'src/common/enums';

//! 수업(Lesson)의 최소 단위로 반(Group)을 설정
//! - 영어 수업이 1주에 2번 있는 경우, 영어수업A 와 영어수업B 처럼 2개 반을 생성.
//! - 영어수업A 와 영어수업B 는 같은 Lesson 이지만 Group 반은 여러개로 나눔.
//! - 영어 수강자가 영어수업A 와 영어수업B 모두 수강하지 않고 하나만 수강하는 경우 대응.
//! - 학생-반 (Student-Group) 관계로 어떤 학생의 수강정보라도 완벽히 추적 가능.
export class CreateGroupDto {
  @ApiPropertyOptional({ description: '반이름' })
  @IsString()
  @MaxLength(16)
  @IsOptional()
  groupName?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(16)
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'class size' })
  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    description: '허용 학년 (예: 1,2,3,4,5,6 또는 "1-6" 문자열)',
  })
  @IsString()
  @IsOptional()
  allowedGrades?: string;

  @ApiPropertyOptional({ description: '수업 요일' })
  // @Transform(({ value }) => {
  //   if (!isNaN(Number(value))) return Number(value);
  //   if (value.length === 1 && typeof value === 'string') {
  //     for (const [key, label] of Object.entries(WeekdayLabels)) {
  //       if (label === value) {
  //         return Number(key);
  //       }
  //     }
  //   }
  //   const enumKey = (value as string).toUpperCase();
  //   return Weekday[enumKey as keyof typeof Weekday];
  // })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiPropertyOptional({ description: '수업 시작 시간' })
  @IsString()
  start: string;

  @ApiPropertyOptional({ description: '수업 종료 시간' })
  @IsString()
  end: string;

  @ApiPropertyOptional({
    description: '상태',
    enum: ClassStatus,
    default: ClassStatus.PENDING,
  })
  @IsEnum(ClassStatus)
  @IsOptional()
  status?: ClassStatus;

  @ApiPropertyOptional({ description: '비고' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string;

  @ApiProperty({ description: '강사성명' })
  @IsString()
  @MaxLength(16)
  @IsOptional()
  instructorName?: string;

  @ApiProperty({ description: '강사전화번호 (숫자만 입력)' })
  @IsString()
  @MaxLength(16)
  @IsOptional()
  instructorPhone?: string;

  @ApiPropertyOptional({ description: 'Instructor ID' })
  @IsInt()
  @IsOptional()
  instructorId?: number;

  @ApiPropertyOptional({ description: 'Lesson ID' })
  @IsInt()
  @IsOptional()
  lessonId?: number;
}

//? 강사 정보를 반드시 포함한 Dto 생성
export class CreateGroupWithInstructorDto extends CreateGroupDto {
  @ApiProperty({ description: '강사성명', required: true })
  @IsNotEmpty()
  @IsString()
  @MaxLength(16)
  declare instructorName: string;

  @ApiProperty({ description: '강사전화번호 (숫자만 입력)', required: true })
  @IsNotEmpty()
  @IsString()
  @MaxLength(16)
  declare instructorPhone: string;

  @ApiPropertyOptional({ description: 'Group ID' })
  @IsInt()
  @IsOptional()
  id?: number;
}
