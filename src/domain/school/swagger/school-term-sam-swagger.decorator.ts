import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Group } from 'src/domain/group/entities/group.entity';
import {
  ResponseSchooldayItemDto,
  ResponseWeeklySchooldayDto,
} from 'src/domain/school/dto/response-student-schoolday.dto';
import { ResponseSchoolTermSamOfferingDto } from '../dto/response-school-term-sam-offering.dto';

//? ---------------------------------------------------------------------- ?//
//? Get School Term Sam Groups
//? ---------------------------------------------------------------------- ?//

export const SchoolTermSamGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👥 담임쌤이 담당하는 반 목록 조회',
      description: '담임쌤이 담당하는 모든 반 목록을 조회합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'samId',
      type: Number,
      description: '담임쌤 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '담임쌤 담당 반 목록 조회 완료',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Sam Offerings
//? ---------------------------------------------------------------------- ?//

export const SchoolTermSamOfferingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📚 담임쌤 수강신청 과목 조회 (그룹별 수업료 포함)',
      description:
        '담임쌤이 담당하는 수강신청 과목 목록을 조회합니다 (그룹별 수업료 포함).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'samId',
      type: Number,
      description: '담임쌤 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '담임쌤 수강신청 과목 목록 조회 완료',
      type: ResponseSchoolTermSamOfferingDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Sam Schooldays
//? ---------------------------------------------------------------------- ?//

export const SchoolTermSamSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 담임쌤 수업일 조회 (all)',
      description: '담임쌤의 모든 수업일을 조회합니다 (Group 정보 포함).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'samId',
      type: Number,
      description: '담임쌤 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '담임쌤 수업일 목록 조회 완료',
      type: ResponseSchooldayItemDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Sam Weekly Schooldays
//? ---------------------------------------------------------------------- ?//

export const SchoolTermSamWeeklySchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 담임쌤 주간 수업일 조회',
      description:
        '담임쌤의 주간 수업일을 요일별로 그룹화하여 조회합니다 (Group 정보 포함).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'samId',
      type: Number,
      description: '담임쌤 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'date',
      type: String,
      description: '기준 날짜 (YYYY-MM-DD 형식, 생략시 오늘 날짜)',
      example: '2024-03-04',
      required: false,
    }),
    ApiOkResponseTemplate({
      description: '담임쌤 주간 수업일 목록 조회 완료 (요일별 그룹화)',
      type: ResponseWeeklySchooldayDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
