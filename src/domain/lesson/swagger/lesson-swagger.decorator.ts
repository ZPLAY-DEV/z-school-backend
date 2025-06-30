import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
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
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Lesson (dryrun)
//? ---------------------------------------------------------------------- ?//

export const CreateLessonDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '과목 👈 생성 (dryrun)',
      description: `
      - 과목 생성 Dryrun 모드
      - 실제로 데이터를 생성하지 않고 어떤 데이터가 생성될지 미리 확인
      `,
    }),
    ApiBody({
      type: CreateLessonDto,
    }),
    ApiOkResponse({
      description: '과목 등록 시뮬레이션 결과',
      schema: {
        oneOf: [
          { $ref: getSchemaPath(Lesson) },
          { type: 'null', nullable: true },
        ],
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
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
    ApiStatuses(StatusCodes.NOT_FOUND),
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
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '과목 업데이트 완료',
      type: Lesson,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
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
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Lesson Days
//? ---------------------------------------------------------------------- ?//

export const UpdateLessonDaysDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '과목 수업일 자동 생성',
      description: `\n- 과목의 기간(start~end)과 그룹의 요일/시간을 기준으로 수업일을 자동 생성합니다.\n- 휴일(캘린더) 정보가 있으면 해당 날짜는 비활성화됩니다.\n- 반환값: 생성된 전체 수업일 수 (number)`,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '과목 ID',
    }),
    ApiOkResponseTemplate({
      description: '생성된 전체 수업일 수 반환',
      type: Number,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
