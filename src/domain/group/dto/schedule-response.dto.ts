import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsArray,
  IsDateString,
} from 'class-validator';

// 강사 정보 DTO
export class ScheduleInstructorDto {
  @ApiProperty({
    description: '강사 ID',
    example: '1 --- 강사앱으로 가입한 강사의 id ( instructorId )',
    type: Number,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: '강사 전화번호',
    example: '01000000001 --- 강사앱으로 가입한 강사의 전화번호',
    type: String,
  })
  @IsString()
  phone: string;
}

// SAM 정보 DTO
export class ScheduleSamDto {
  @ApiProperty({
    description: 'SAM ID',
    example: '1 --- 학교에서 등록한 강사의 id ( samId )',
    type: Number,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'SAM 별칭',
    example: '아줌마 --- 학교에서 등록한 강사의 별칭',
    type: String,
  })
  @IsString()
  alias: string;

  @ApiProperty({
    description: '강사 정보',
    type: ScheduleInstructorDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleInstructorDto)
  instructor?: ScheduleInstructorDto;
}

// 수업일 정보 DTO
export class SchooldayDto {
  @ApiProperty({
    description: '수업일 ID',
    example: '13 --- 학교에서 등록한 그룹(group)의 수업일의 id ( schooldayId )',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: '수업 시작 시간',
    example: '2025-06-03T04:50:00.000Z --- 수업일의 시작 시간',
    type: Date,
  })
  @IsDateString()
  startsAt: Date;

  @ApiProperty({
    description: '수업 종료 시간',
    example: '2025-06-03T05:30:00.000Z --- 수업일의 종료 시간',
    type: Date,
  })
  @IsDateString()
  endsAt: Date;

  @ApiProperty({
    description: '총 수업 일수',
    example: '40 --- 총 수업일수 ',
    type: Number,
  })
  @IsNumber()
  duration: number;
}

// 그룹 정보 DTO
export class ScheduleGroupDto {
  @ApiProperty({
    description: '그룹 ID',
    example: 'group id --- 수강중인 group의 id',
    type: Number,
  })
  @IsNumber()
  id: number;

  @ApiProperty({ description: '그룹명', example: '줄넘기:화요일A반' })
  @IsString()
  groupName: string;

  @ApiProperty({ description: '수업 장소', example: '운동장' })
  @IsString()
  location: string;

  @ApiProperty({ description: '요일', example: '화' })
  @IsString()
  weekday: string;

  @ApiProperty({ description: '수업 시작 시간', example: '13:50' })
  @IsString()
  start: string;

  @ApiProperty({ description: '수업 종료 시간', example: '14:30' })
  @IsString()
  end: string;

  @ApiProperty({
    description: '해당 날짜의 수업일 정보',
    type: [SchooldayDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchooldayDto)
  schooldays: SchooldayDto[];

  @ApiProperty({
    description: 'SAM 정보',
    type: ScheduleSamDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleSamDto)
  sam?: ScheduleSamDto;
}

// 일별 스케줄 DTO
export class DailyScheduleDto {
  @ApiProperty({
    description: '날짜',
    example:
      '2025-06-03 --- 프론트에서 요청을 보낸 일주일치 배열중 해당하는 날짜 ',
  })
  @IsString()
  date: string;

  @ApiProperty({
    description: '요일',
    example: '일 --- 해당 날짜의 요일',
  })
  @IsString()
  weekday: string;

  @ApiProperty({
    description: '날짜(요일)',
    example: '2025-06-01(일) --- 해당 날짜의 날짜(요일)',
  })
  @IsString()
  displayDate: string;

  @ApiProperty({
    description: '해당 날짜의 수업 목록',
    type: [ScheduleGroupDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleGroupDto)
  groups: ScheduleGroupDto[];
}

// 최종 응답 DTO
export class ScheduleResponseDto {
  @ApiProperty({
    description: '조회 기간 시작일',
    example:
      '2025-06-01 --- 프론트에서 요청을 보낸 일주일치 배열중 첫번째 날짜',
  })
  @IsString()
  startDate: string;

  @ApiProperty({
    description: '조회 기간 종료일',
    example:
      '2025-06-07 --- 프론트에서 요청을 보낸 일주일치 배열중 마지막 날짜',
  })
  @IsString()
  endDate: string;

  @ApiProperty({
    description: '일별 스케줄 목록',
    type: [DailyScheduleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyScheduleDto)
  schedules: DailyScheduleDto[];
}
