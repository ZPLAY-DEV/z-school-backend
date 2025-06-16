import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { CreateStudentDto } from '../dto/create-student.dto';

import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { StudentResponseDto } from '../dto/student-response.dto';

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 일괄 생성
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolStudentBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생 일괄 생성',
      description: `
      - upsert 방식으로 동작하기 때문에, 안심하고 덮어쓰면 됨.
      - 여러개 학생 생성 또는 업데이트 (XLSX 파일 형식으로 전달시 사용)
      - 학교 아이디, 학년, 반, 번호 조합은 반드시 유니크 하기 때문에, 이미 등록되어 있는 학생의 정보를 입력할 경우, upsert 됨.
      `,
    }),
    ApiBody({
      type: CreateStudentDto,
      isArray: true,
    }),
    ApiCreatedResponse({
      description: '여러 학생 일괄 등록 완료',
      type: Number,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) Create School > Students Bulk (DryRun)
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolStudentsBulkDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생 bulk 생성 (dryrun)',
      description: `
      - 학생(Bulk) 생성 dryrun 체크 -> dryrun은 실제로 데이터를 등록할 때, 데이터를 덮어쓰는 여부를 판별하는 엔드포인트
      - 실제로 데이터를 생성하지 않고 어떤 데이터가 생성될지 미리 확인 ( 해당 엔드포인트로 Upsert 여부를 결정 )
      - 반환되는 값이 존재할 경우 schoolId - grade - class - studentCode 로 중복 여부를 판단
      - 반환되는 값이 빈 배열일 경우, 중첩되는 학생이 없음을 의미 
      `,
    }),
    ApiBody({
      type: CreateStudentDto,
      isArray: true,
    }),
    ApiOkResponseTemplate({
      description: '덮어쓰여질 레코드 목록',
      type: StudentResponseDto,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 일괄 조회
//? ---------------------------------------------------------------------- ?//
export const SchoolStudentListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생 일괄 조회',
      description: `
      - 학생 일괄 조회
      - 학생은 학년, 반, 학번/번호 순으로 정렬됨.
      - 페이징 X
      - 반환되는 parent 객체에 userId 값이 null인 경우 앱 미사용 학부모, null이 아닌경우 앱 사용 유저라고 프론트에서 핸들링 
      - 반환되는 picks 객체 배열에 맞춰서 수강중인 강좌를 프론트에서 핸들링
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkResponseTemplate({
      description: '학생 일괄 조회 완료',
      type: StudentResponseDto,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 일괄 조회 (페이징)
//? ---------------------------------------------------------------------- ?//
export const SchoolStudentListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생 일괄 조회 & 검색 & 필터 (페이징)',
      description: `
      - 학생 일괄 조회 (페이징)
      - 해당 엔드포인트로 페이징 기반의 학생 전체조회, 학생 검색, 필터가 가능함.
      - 검색 조건: name(이름), phone(전화번호), escortPhone(보호자 전화번호)
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=홍길동 ?search=01012345678 ...
      - 필터 조건: grade(학년), class(반), studentCode(학번/번호), name(이름), status(상태)
        - 필터시 QueryString에 filter.grade, filter.class .. 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.grade=1&filter.class=1 ...
      - 정렬은 기본적으로 학교에 속한 학생들을 기준으로 grade ( 학년 ), class ( 반 ), studentCode ( 학번/번호 ) 순으로 정렬됨.
      - 정렬 조건: grade(학년), class(반), studentCode(학번/번호)
        - 정렬시 QueryString에 sortBy 키워드를 통해 정렬 조건을 입력할 수 있음. EX) ?sortBy=grade:ASC&sortBy=class:ASC&sortBy=studentCode:ASC ...
      - 반환되는 parent 객체에 userId 값이 null인 경우 앱 미사용 학부모, null이 아닌경우 앱 사용 유저라고 프론트에서 핸들링 
      - 반환되는 picks 객체 배열에 맞춰서 수강중인 강좌를 프론트에서 핸들링
      `,
    }),
    ApiOkPaginatedResponse(StudentResponseDto, {
      sortableColumns: ['grade', 'class', 'studentCode', 'name'],
      defaultSortBy: [
        ['grade', 'ASC'],
        ['class', 'ASC'],
        ['studentCode', 'ASC'],
      ],
      filterableColumns: {
        grade: [FilterOperator.EQ],
        class: [FilterOperator.EQ],
        studentCode: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['grade', 'class', 'studentCode'],
      defaultSortBy: [
        ['grade', 'ASC'],
        ['class', 'ASC'],
        ['studentCode', 'ASC'],
      ],
      searchableColumns: ['name', 'parent.phone', 'escortPhone'],
      filterableColumns: {
        grade: [FilterOperator.EQ],
        class: [FilterOperator.EQ],
        studentCode: [FilterOperator.EQ],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
      },
    }),
  );
};
