import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
import { CreateSamDto } from '../dto/create-sam.dto';
import { DeleteSamNoteDto } from '../dto/delete-sam-note.dto';
import { UpdateSamDto } from '../dto/update-sam.dto';

//? ---------------------------------------------------------------------- ?//
//? Create School Sam
//? ---------------------------------------------------------------------- ?//
export const CreateSamDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에 속한 강사 생성 (단일)',
      description: `
      - 학교에 귀속된 강사를 단일로 생성한다.
      - 학교에 귀속된 강사의 정보와 강사의 정보가 이미 등록되어 있을 경우 Upsert 된다. ( 업데이트에서도 해당 엔드포인트로 처리 가능 )
      `,
    }),
    ApiBody({
      type: CreateSamDto,
    }),
    ApiCreatedResponseTemplate({
      description: '학교에 속한 강사 생성 완료',
      type: Sam,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? School Sam (dryrun)
//? ---------------------------------------------------------------------- ?//
export const SamDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에 속한 강사 dryRun 체크',
      description: `
      - 학교에 속한 강사(단일) 생성 dryrun 체크 -> dryrun은 실제로 데이터를 등록할 때, 데이터를 덮어쓰는 여부를 판별하는 엔드포인트
      - 실제로 데이터를 생성하지 않고 어떤 데이터가 생성될지 미리 확인 ( 해당 엔드포인트로 Upsert 여부를 결정 )
      - 반환되는 값이 존재할 경우 schoolId - instructor.phone 로 중복 여부를 판단
      - 반환되는 값이 존재 하지 않을 경우 (null인 경우), 중첩되는 강사가 없음을 의미
      `,
    }),
    ApiBody({
      type: CreateSamDto,
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사 등록 시물레이션 결과',
      type: Sam,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Soft Delete Sam
//? ---------------------------------------------------------------------- ?//
export const SoftDeleteSamDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에 속한 강사 소프트 삭제',
      description: `
      - 학교에 속한 강사를 소프트 삭제한다. (soft delete)
      - note 필드에 삭제 사유를 입력할 수 있음.
      - 삭제 후 해당 강사는 학교에서 조회되지 않음.
      - 해당 강사의 모든 정보는 삭제되지 않음.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교에 속한 강사 ID ( instructorSchoolId )',
    }),
    ApiBody({
      type: DeleteSamNoteDto,
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사 소프트 삭제 완료',
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Sam by ID
//? ---------------------------------------------------------------------- ?//
export const GetSamByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에 속한 강사 상세 조회',
      description: `
      - 학교에 속한 특정 강사의 상세 정보를 조회한다.
      - 학교에 속한 강사의 상세 정보를 조회한다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '강사 ID',
    }),
    ApiExtraModels(Sam, Instructor, Contract),
    ApiOkResponse({
      description: '학교에 속한 강사 상세 조회',
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
                items: { $ref: getSchemaPath(Contract) },
              },
            },
          },
        ],
      },
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Sam Groups
//? ---------------------------------------------------------------------- ?//
export const GetSamGroupsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary:
        '✅ 학교에 속한 강사의 반 & 학생 상세 조회 --- 학교에 속한 강사의 상세 수업정보 조회',
      description: `
      - 학교에 속한 특정 강사가 관리하는 반 목록을 조회한다.
      - 반 목록에는 반 정보와 반 학생 목록이 포함된다.
      - termId를 전달하면 해당 학기의 반만 필터링하여 조회된다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '강사 ID',
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (선택사항, 전달 시 해당 학기의 반만 필터링)',
      required: false,
    }),
    ApiExtraModels(Group, Lesson),
    ApiOkResponse({
      description: '학교에 속한 강사의 반 & 학생 상세 조회',
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
              },
            },
          ],
        },
      },
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Sam
//? ---------------------------------------------------------------------- ?//
export const UpdateSamDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에 속한 강사 정보 수정',
      description: `
      - 학교에 속한 강사의 정보를 수정한다.
      - alias, score, editFeePermission, editPickPermission, note 등의 정보를 수정할 수 있다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교에 속한 강사 ID',
    }),
    ApiBody({
      type: UpdateSamDto,
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사 정보 수정 완료',
      type: Sam,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
