import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { DocumentResponseDto } from 'src/domain/document/dto/document-response.dto';
import { GroupPickResponseDto } from 'src/domain/group/dto/group-pick-response.dto';
import { ScheduleResponseDto } from 'src/domain/group/dto/schedule-response.dto';
import { CreateSamResponseDto } from '../dto/create-sam-response.dto';
import { CreateSamDto } from '../dto/create-sam.dto';
import { DeleteSamNoteDto } from '../dto/delete-sam-note.dto';
import { SamRelationResponseDto } from '../dto/sam-relation-response.dto';
import { SamResponseDto } from '../dto/sam-response.dto';

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
      type: CreateSamResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
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
      type: SamResponseDto,
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
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
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
    ApiOkResponseTemplate({
      description: '학교에 속한 강사 상세 조회',
      type: SamRelationResponseDto,
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
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '강사 ID',
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사의 반 & 학생 상세 조회',
      type: GroupPickResponseDto,
      isArray: true,
    }),
  );
};
//? ---------------------------------------------------------------------- ?//
//? Get Sam Documents
//? ---------------------------------------------------------------------- ?//
export const SamDocumentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에 속한 강사의 문서 조회',
      description: `
      - 학교에 속한 특정 강사가 제출한 문서를 조회한다.
      - 페이징 x
      `,
    }),
    ApiParam({
      name: 'samId',
      type: Number,
      description: '강사 ID',
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사의 문서 조회',
      type: DocumentResponseDto,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//?  학교에 속한 강사의 수업 일정 조회 ( 주단위 )
//? ---------------------------------------------------------------------- ?//
export const SamScheduleFindByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary:
        '✅ 학교에 속한 강사(쌤)의 수업 일정 조회 --- 학교에 속한 강사의 주간 강의일정 조회',
      description: `
      - 학교에 속한 강사의(쌤) 수업 일정 조회
      - 반드시 주간 일요일 ~ 토요일 기준으로 QueryString에 날짜형식 2025-06-01 으로 전달해야함.
      - 해당 주차에 수업이 있는 강좌가 없을 경우 객체 배열의 형태는 유지하되, 내부의 groups 배열은 비어있는 값이 반환됨.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교에 속한 강사(쌤)의 ID',
      required: true,
    }),
    ApiQuery({
      name: 'dates',
      type: [String],
      description: '조회할 날짜 배열',
      example: [
        '2025-06-01',
        '2025-06-02',
        '2025-06-03',
        '2025-06-04',
        '2025-06-05',
        '2025-06-06',
        '2025-06-07',
      ],
      required: true,
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사의 주간 수업 일정 조회 완료',
      type: ScheduleResponseDto,
    }),
  );
};
