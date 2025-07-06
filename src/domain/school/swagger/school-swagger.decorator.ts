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
import { CreateSchoolDto } from '../dto/create-school.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';
import { School } from '../entities/school.entity';

export const CreateSchoolDocs = () =>
  applyDecorators(
    ApiOperation({ summary: '학교 생성' }),
    ApiBody({ type: CreateSchoolDto }),
    ApiCreatedResponseTemplate({ description: '학교 생성 완료', type: School }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

export const ListSchoolsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: '학교 목록 조회' }),
    ApiQuery({ name: 'region', enum: Region, required: false }),
    ApiOkResponse({ description: '학교 목록 조회 완료', type: [School] }),
  );

export const PaginatedSchoolsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: '학교 페이지네이션 목록' }),
    ApiOkResponse({ description: '페이지네이션된 학교 목록 조회 완료' }),
  );

export const FindSchoolDocs = () =>
  applyDecorators(
    ApiOperation({ summary: '학교 상세 조회' }),
    ApiParam({ name: 'id', type: Number }),
    ApiOkResponseTemplate({ description: '학교 상세 조회 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const UpdateSchoolDocs = () =>
  applyDecorators(
    ApiOperation({ summary: '학교 정보 수정' }),
    ApiParam({ name: 'id', type: Number }),
    ApiBody({ type: UpdateSchoolDto }),
    ApiOkResponseTemplate({ description: '학교 수정 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const DeleteSchoolDocs = () =>
  applyDecorators(
    ApiOperation({ summary: '학교 삭제' }),
    ApiParam({ name: 'id', type: Number }),
    ApiOkResponseTemplate({ description: '학교 삭제 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const GenerateS3UrlsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: '학교 프로모션 이미지 업로드 URL 생성' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          schoolId: { type: 'number', example: 1 },
          mimeType: { type: 'string', example: 'image/jpeg' },
        },
        required: ['schoolId', 'mimeType'],
      },
    }),
    ApiOkResponse({ description: 'S3 업로드 URL 생성 완료' }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
