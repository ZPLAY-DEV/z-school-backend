import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { BulkUpdateSamsDto } from '../dto/bulk-update-sams.dto';
import { CreateSamDto } from '../dto/create-sam.dto';
import { UpdateSamDto } from '../dto/update-sam.dto';

//? ---------------------------------------------------------------------- ?//
//? Create
//? ---------------------------------------------------------------------- ?//

export const CreateSamDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임쌤 생성',
      description:
        '새로운 담임쌤을 시스템에 등록합니다. 기존 강사와 연결하거나 새로운 강사와 함께 생성할 수 있습니다.',
    }),
    ApiBody({
      type: CreateSamDto,
      examples: {
        'instructor-id': {
          summary: '기존 강사 ID로 연결',
          value: {
            schoolId: 1,
            alias: '홍선생',
            score: 85,
            editFeePermission: true,
            editPickPermission: false,
            note: '수학 전문 강사',
            instructorId: 1,
          },
        },
        'new-instructor': {
          summary: '새로운 강사와 함께 생성',
          value: {
            schoolId: 1,
            alias: '김수학쌤',
            score: 95,
            editFeePermission: true,
            editPickPermission: true,
            note: '초등 수학 전문',
            instructor: {
              name: '김수학',
              phone: '01087654321',
              note: '서울대 수학교육과 졸업',
            },
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '담임쌤 생성 성공',
      type: Sam,
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description: '요청 데이터 오류 - 필수 필드 누락, 데이터 형식 오류',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '존재하지 않는 학교 ID 또는 강사 ID',
    }),
    ApiResponse({
      status: StatusCodes.CONFLICT,
      description: '동일 학교 내 강사 중복',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? School Sam (dryrun)
//? ---------------------------------------------------------------------- ?//

export const SamDryRunDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임쌤 생성 사전 검증',
      description:
        '담임쌤 생성 전 중복 여부를 사전 검증합니다. 중복이 없으면 null을, 있으면 중복되는 담임쌤 정보를 반환합니다.',
    }),
    ApiBody({
      type: CreateSamDto,
      examples: {
        'instructor-id': {
          summary: '기존 강사 ID로 검증',
          value: {
            schoolId: 1,
            alias: '홍선생',
            instructorId: 1,
          },
        },
        'new-instructor': {
          summary: '새로운 강사로 검증',
          value: {
            schoolId: 1,
            alias: '김수학쌤',
            instructor: {
              phone: '01087654321',
            },
          },
        },
      },
    }),
    ApiOkResponse({
      description: '검증 완료',
      schema: {
        oneOf: [
          { type: 'null', description: '중복 없음 - 생성 가능' },
          {
            $ref: '#/components/schemas/Sam',
            description: '중복 담임쌤 정보',
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Get Sam by ID
//? ---------------------------------------------------------------------- ?//

export const GetSamByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임쌤 상세 조회',
      description:
        '특정 담임쌤의 상세 정보를 조회합니다. 강사 정보, 계약 정보, 그룹 정보, 수업 정보를 포함합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiExtraModels(Sam, Instructor, Contract, Group, Lesson),
    ApiOkResponse({
      description: '담임쌤 상세 조회 성공',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Sam) },
          {
            type: 'object',
            properties: {
              instructor: {
                $ref: getSchemaPath(Instructor),
              },
              contracts: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: getSchemaPath(Contract) },
                    {
                      type: 'object',
                      properties: {
                        group: {
                          allOf: [
                            { $ref: getSchemaPath(Group) },
                            {
                              type: 'object',
                              properties: {
                                schooldays: {
                                  type: 'array',
                                  items: { $ref: getSchemaPath(Schoolday) },
                                },
                              },
                            },
                          ],
                        },
                        lesson: {
                          $ref: getSchemaPath(Lesson),
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '존재하지 않는 담임쌤 ID',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Get Sam Groups
//? ---------------------------------------------------------------------- ?//

export const GetSamGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임쌤의 반 목록 조회',
      description:
        '담임쌤이 담당하는 반 목록을 조회합니다. 학기별 필터링과 정렬이 가능합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (선택사항)',
      required: false,
    }),
    ApiQuery({
      name: 'sortBy',
      type: String,
      description: '정렬 기준 (선택사항: "weekday", "name")',
      required: false,
      enum: ['weekday', 'name'],
    }),
    ApiOkResponse({
      description: '반 목록 조회 성공',
      schema: {
        type: 'array',
        items: {
          allOf: [
            { $ref: getSchemaPath(Group) },
            {
              type: 'object',
              properties: {
                lesson: {
                  $ref: getSchemaPath(Lesson),
                },
                picksCount: {
                  type: 'number',
                  description: '활성 픽업 수',
                },
              },
            },
          ],
        },
      },
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '존재하지 않는 담임쌤 ID',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Get Sam All Schooldays
//? ---------------------------------------------------------------------- ?//

export const GetAllSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임쌤의 모든 수업일 조회',
      description:
        '담임쌤이 담당하는 모든 수업일을 조회합니다. 학기별, 월별 필터링이 가능합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (필수)',
      required: true,
    }),
    ApiQuery({
      name: 'month',
      type: String,
      description: '조회할 월 (YYYY-MM 형식, 선택사항)',
      required: false,
      example: '2025-08',
    }),
    ApiExtraModels(Schoolday),
    ApiOkResponse({
      description: '수업일 목록 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Schoolday) },
      },
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '존재하지 않는 담임쌤 ID',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Get Sam Schooldays By Date
//? ---------------------------------------------------------------------- ?//

export const GetSchooldaysByDateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 날짜의 수업일 조회',
      description: '담임쌤이 담당하는 특정 날짜의 수업일을 조회합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (필수)',
      required: true,
    }),
    ApiQuery({
      name: 'date',
      type: String,
      description: '조회할 날짜 (YYYY-MM-DD 형식, 필수)',
      required: true,
      example: '2025-01-15',
    }),
    ApiExtraModels(Schoolday),
    ApiOkResponse({
      description: '특정 날짜 수업일 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Schoolday) },
      },
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '존재하지 않는 담임쌤 ID',
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description: '잘못된 날짜 형식',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Update Sam
//? ---------------------------------------------------------------------- ?//

export const UpdateSamDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임쌤 정보 수정',
      description:
        '담임쌤의 정보를 수정합니다. alias, score, 권한, 강사 정보 등을 수정할 수 있습니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiBody({
      type: UpdateSamDto,
      examples: {
        'basic-update': {
          summary: '기본 정보 수정',
          value: {
            alias: '김수학쌤',
            score: 95,
            editFeePermission: true,
            editPickPermission: true,
            note: '수학 전문 강사',
          },
        },
        'instructor-update': {
          summary: '강사 정보 수정',
          value: {
            alias: '홍선생',
            instructor: {
              name: '홍길동',
              phone: '01012345678',
              note: '10년 경력',
            },
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '담임쌤 정보 수정 완료',
      type: Sam,
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '존재하지 않는 담임쌤 ID',
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description: '요청 데이터 오류',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Bulk Update Sams
//? ---------------------------------------------------------------------- ?//

export const BulkUpdateSamsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임쌤 일괄 수정',
      description:
        '여러 담임쌤의 정보를 한 번에 일괄 수정합니다. samIds로 직접 지정하거나 termId로 학기별 일괄 수정이 가능합니다.',
    }),
    ApiBody({
      type: BulkUpdateSamsDto,
      examples: {
        'score-update': {
          summary: '평가 점수 일괄 수정',
          value: {
            samIds: [1, 2, 3, 4],
            score: 90,
          },
        },
        'permission-update': {
          summary: '권한 일괄 수정',
          value: {
            samIds: [1, 2, 3],
            editFeePermission: true,
            editPickPermission: false,
          },
        },
        'term-based-update': {
          summary: '학기별 일괄 수정',
          value: {
            score: 85,
            editFeePermission: true,
          },
        },
      },
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description:
        '학기 ID (선택사항, 전달 시 해당 학기의 모든 담임쌤을 자동 선택)',
      required: false,
    }),
    ApiOkResponseTemplate({
      description: '담임쌤 일괄 수정 성공',
      type: Sam,
      isArray: true,
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description:
        '요청 데이터 오류 - 데이터 형식 오류, 유효하지 않은 점수 범위',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '존재하지 않는 담임쌤 ID 또는 해당 학기에 담임쌤이 없음',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Soft Delete Sam
//? ---------------------------------------------------------------------- ?//

export const SoftDeleteSamDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임쌤 소프트 삭제',
      description:
        '담임쌤을 소프트 삭제합니다. deletedAt 컬럼에 삭제 시각을 기록하여 논리적으로만 삭제합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          note: {
            type: 'string',
            description: '삭제 사유 (선택사항)',
            example: '퇴사',
          },
        },
      },
      required: false,
    }),
    ApiOkResponseTemplate({
      description: '담임쌤 소프트 삭제 완료',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '존재하지 않는 담임쌤 ID',
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description: '요청 데이터 오류',
    }),
  );
