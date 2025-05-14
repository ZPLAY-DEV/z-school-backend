import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { Lesson } from '../entities/lesson.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Lesson
//? ---------------------------------------------------------------------- ?//

export const CreateLessonDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '과목 👈 생성',
      description: `
      - 과목 생성(upsert)
      `,
    }),
    ApiBody({
      type: CreateLessonDto,
    }),
    ApiCreatedResponseTemplate({
      description: '과목 등록 완료',
      type: Lesson,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Lesson by ID
//? ---------------------------------------------------------------------- ?//

export const GetLessonByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '과목 👈 상세 조회',
      description: `
      - 과목 ID로 상세 정보 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '과목 ID',
    }),
    ApiOkResponseTemplate({
      description: '과목 상세 조회 완료',
      type: Lesson,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Lesson
//? ---------------------------------------------------------------------- ?//

export const UpdateLessonDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '과목 👈 수정',
      description: `
      - 과목 업데이트
      - Request의 UpdateLessonDto는 PartialType(CreateLessonDto)로 변경 원하는 필드만 작성
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '과목 ID',
    }),
    ApiBody({
      type: UpdateLessonDto,
      examples: {
        example1: {
          value: {
            lessonName: '과목명',
            requiredDocuments: ['경력증명서'],
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '과목 업데이트 완료',
      type: Lesson,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Remove Lesson
//? ---------------------------------------------------------------------- ?//

export const RemoveLessonDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '과목 👈 삭제',
      description: `
      - 과목 삭제
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '과목 ID',
    }),
    ApiOkResponseTemplate({
      description: '과목 삭제 완료',
      type: Lesson,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};
