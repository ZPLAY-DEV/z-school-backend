import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { Region } from 'src/common/enums';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';
import { School } from '../entities/school.entity';

export const CreateSchoolDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫 학교 생성',
      description: '새로운 학교를 시스템에 등록합니다.',
    }),
    ApiBody({ type: CreateSchoolDto }),
    ApiCreatedResponseTemplate({ description: '학교 생성 완료', type: School }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

export const ListSchoolsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫 학교 목록 조회',
      description: '등록된 학교 목록을 조회합니다 (지역별 필터링 지원).',
    }),
    ApiQuery({
      name: 'region',
      enum: Region,
      required: false,
      description: '지역 필터 (선택사항)',
    }),
    ApiOkResponse({ description: '학교 목록 조회 완료', type: [School] }),
  );

export const GetSchoolLessonsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📚 학교 과목 목록 조회',
      description: '학교에 등록된 모든 과목(Lesson) 목록을 조회합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '학교 과목 목록 조회 완료',
      type: Lesson,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const PaginatedSchoolsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫📄 학교 페이지네이션 목록',
      description:
        '학교 목록을 페이지네이션으로 조회합니다 (검색, 정렬, 필터링 지원).',
    }),
    ApiOkResponse({ description: '페이지네이션된 학교 목록 조회 완료' }),
  );

export const FindSchoolDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫🔍 학교 상세 조회',
      description: '특정 학교의 상세 정보를 조회합니다 (학기, 일정 포함).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({ description: '학교 상세 조회 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const UpdateSchoolDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫✏️ 학교 정보 수정',
      description: '학교 정보를 수정합니다 (부분 수정 지원).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiBody({ type: UpdateSchoolDto }),
    ApiOkResponseTemplate({ description: '학교 수정 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const DeleteSchoolDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫🗑️ 학교 삭제',
      description: '학교를 삭제합니다 (Soft Delete).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({ description: '학교 삭제 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const GenerateS3UrlsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📷 학교 프로모션 이미지 업로드 URL 생성',
      description:
        '학교 프로모션 이미지 업로드를 위한 S3 Presigned URL을 생성합니다.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          schoolId: {
            type: 'number',
            example: 123,
            description: '학교 ID',
          },
          mimeType: {
            type: 'string',
            example: 'image/jpeg',
            description: '업로드할 파일의 MIME 타입',
          },
          filename: {
            type: 'string',
            example: 'promo.jpg',
            description: '파일명 (선택사항)',
          },
        },
        required: ['schoolId', 'mimeType'],
      },
    }),
    ApiOkResponse({
      description: 'S3 업로드 URL 생성 완료',
      schema: {
        type: 'object',
        properties: {
          uploadUrl: {
            type: 'string',
            description: 'S3 Presigned 업로드 URL',
          },
          fileKey: {
            type: 'string',
            description: 'S3 파일 키',
          },
          expiresIn: {
            type: 'number',
            description: 'URL 만료 시간 (초)',
          },
          maxFileSize: {
            type: 'number',
            description: '최대 파일 크기 (바이트)',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
