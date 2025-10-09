import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { UpdateReminderDto } from '../dto/update-reminder.dto';
import { Reminder } from '../entities/reminder.entity';

//? ---------------------------------------------------------------------- ?//
//? Reminder Controller - CREATE
//? ---------------------------------------------------------------------- ?//

export const CreateReminderDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '⏰ 수강신청 안내 생성',
      description:
        '학기에 귀속된 수강신청 안내를 생성합니다 (학기당 1개만 생성 가능).',
    }),
    ApiBody({ type: CreateReminderDto }),
    ApiCreatedResponseTemplate({
      description: '수강신청 안내 생성 완료',
      type: Reminder,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Reminder Controller - READ
//? ---------------------------------------------------------------------- ?//

export const FindReminderByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 수강신청 안내 상세 조회',
      description: '수강신청 안내의 상세 정보를 조회합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 수강신청 안내의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '수강신청 안내 상세 조회 완료',
      type: Reminder,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Reminder Controller - UPDATE
//? ---------------------------------------------------------------------- ?//

export const UpdateReminderDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 수강신청 안내 수정',
      description:
        '수강신청 안내 정보를 부분적으로 수정합니다 (제공된 필드만 업데이트).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 수강신청 안내의 ID',
      example: 1,
    }),
    ApiBody({ type: UpdateReminderDto }),
    ApiOkResponseTemplate({
      description: '수강신청 안내 수정 완료',
      type: Reminder,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

export const MarkAsReadByParentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✅ 수강신청 안내 읽음 표시 (학부모 기준)',
      description:
        '학부모의 모든 자녀에 대해 수강신청 안내를 읽음 처리합니다 (다자녀 가정 편의성). 💡 특정 학생만 읽음 처리는 PATCH /reminders/:id/students/:studentId/read 사용.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수강신청 안내 ID',
      example: 1,
    }),
    ApiParam({
      name: 'parentId',
      type: Number,
      description: '학부모 ID',
      example: 5,
    }),
    ApiOkResponse({
      description: '읽음 표시 완료',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const MarkAsReadByStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✅ 수강신청 안내 읽음 표시 (학생 기준)',
      description:
        '특정 학생에 대해서만 수강신청 안내를 읽음 처리합니다 (정확한 개별 처리). 💡 모든 자녀 일괄 읽음 처리는 PATCH /reminders/:id/parents/:parentId/read 사용.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수강신청 안내 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 10,
    }),
    ApiOkResponse({
      description: '읽음 표시 완료',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Reminder Controller - DELETE
//? ---------------------------------------------------------------------- ?//

export const DeleteReminderDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 수강신청 안내 삭제',
      description:
        '수강신청 안내를 소프트 삭제합니다 (Notifiable과 Recipient도 함께 삭제).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 수강신청 안내의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '수강신청 안내 삭제 완료',
      type: Reminder,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Reminder Controller - EXTRAS
//? ---------------------------------------------------------------------- ?//

export const GenerateReminderS3UrlsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📎 수강신청 안내 첨부파일 업로드 URL 생성',
      description:
        '수강신청 안내 첨부 파일의 S3 Pre-signed 업로드 URL을 생성합니다 (10분 유효).',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['schoolId', 'termId', 'mimeType'],
        properties: {
          schoolId: { type: 'number', example: 1 },
          termId: { type: 'number', example: 1 },
          mimeType: {
            type: 'string',
            enum: [
              'image/jpeg',
              'image/jpg',
              'image/png',
              'image/gif',
              'image/webp',
              'application/pdf',
            ],
            example: 'image/jpeg',
          },
          filename: { type: 'string', example: 'reminder-guide.jpg' },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: 'S3 업로드 URL 생성 완료',
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.INTERNAL_SERVER_ERROR),
  );
};
