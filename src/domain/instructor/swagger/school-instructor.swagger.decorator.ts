import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { CreateInstructorDto } from '../dto/create-instructor.dto';
import { CreateInstructorResponseDto } from '../dto/create-instructor-response.dto';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { InstructorResponseDto } from '../dto/instructor-response.dto';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { DocumentResponseDto } from 'src/domain/document/dto/document-response.dto';

//? ---------------------------------------------------------------------- ?//
//? Create School > Instructor Bulk
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolInstructorBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 > 강사 의 bulk 생성',
      description: `
      - 학교에 속한 강사를 BULK 로 생성할 때, 사용 ( 강사 업로드시 사용)
      - upsert 방식으로 동작하기 때문에, 안심하고 덮어쓰면 됨.
      - 여러개 강사 생성 또는 업데이트 (XLSX 로 전달시 사용)
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: CreateInstructorDto,
      isArray: true,
    }),
    ApiCreatedResponseTemplate({
      description: '여러 강사를 일괄 등록 완료',
      type: CreateInstructorResponseDto,
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
//? Read School > Instructor
//? ---------------------------------------------------------------------- ?//
export const SchoolInstructorListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 리스트 조회',
      description: `
      - 학교에 속한 강사 리스트를 조회한다.
      - 기본적으로 강사의 이름순으로 정렬되어 반환된다.
      - 페이징 X 
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkResponseTemplate({
      description: '강사 리스트 조회 완료',
      type: InstructorResponseDto,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Read School > Instructor (Paginated)
//? ---------------------------------------------------------------------- ?//
export const SchoolInstructorListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 리스트 (페이징)',
      description: `
      - 학교에 속한 강사 리스트를 페이징 조회한다.
      - 해당 엔드포인트로 페이징 기반 강사 전체조회, 강사 검색, 필터가 가능하다.
      - 기본적으로 강사의 이름순으로 정렬되어 반환된다. 
      - 검색 조건: instructorSchools.alias(강사의 별칭 ), phone ( 강사의 전화번호 )
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=홍길동 ?search=01012345678 ...
      - 필터 조건: instructor.pushToken(푸시토큰), instructorSchools.editFeePermission(수업료 수정 권한), instructorSchools.editEnrollmentPermission(수강신청 수정 권한)
        - 필터시 QueryString에 filter.instructor.pushToken, filter.instructorSchools.editFeePermission, filter.instructorSchools.editEnrollmentPermission 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.instructor.pushToken=null&filter.instructorSchools.editFeePermission=1&filter.instructorSchools.editEnrollmentPermission=1 ..
      - 정렬 조건: instructorSchools.alias(강사의 별칭) 을 기본 정렬 조건으로 사용함.
      `,
    }),
    ApiOkPaginatedResponse(InstructorResponseDto, {
      sortableColumns: ['instructorSchools.alias'],
      defaultSortBy: [['instructorSchools.alias', 'ASC']],
      filterableColumns: {
        'instructor.pushToken': [FilterOperator.EQ],
        'instructorSchools.editFeePermission': [FilterOperator.EQ],
        'instructorSchools.editEnrollmentPermission': [FilterOperator.EQ],
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['instructorSchools.alias'],
      defaultSortBy: [['instructorSchools.alias', 'ASC']],
      searchableColumns: ['instructorSchools.alias', 'phone'],
      filterableColumns: {
        'instructor.pushToken': [FilterOperator.EQ],
        'instructorSchools.editFeePermission': [FilterOperator.EQ],
        'instructorSchools.editEnrollmentPermission': [FilterOperator.EQ],
      },
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Read School > Instructor > Documents
//? ---------------------------------------------------------------------- ?//
export const SchoolInstructorDocumentsListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 > 문서 리스트',
      description: `
      - 학교에 속한 강사의 문서 리스트를 조회한다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiParam({
      name: 'instructorId',
      type: Number,
      description: '강사 ID',
    }),
    ApiOkResponseTemplate({
      description: '문서 리스트 조회 완료',
      type: DocumentResponseDto,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create School > Instructor Bulk Dry Run
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolInstructorsBulkDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 > 강사 의 bulk 생성 (Dry Run)',
      description: `
      - 학교에 속한 강사를 BULK 로 생성할 때, 사용 ( 강사 업로드시 사용)
      - 실제로 데이터를 생성하지 않고 어떤 데이터가 생성될지 미리 확인 ( 해당 엔드포인트로 Upsert 여부를 결정 )
      - 반환되는 값이 존재할 경우 schoolId - phone(강사의 휴대폰 번호)로 중복 여부를 판단
      - 반환되는 값이 빈 배열일 경우, 중첩되는 강사가 없음을 의미 
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: CreateInstructorDto,
      isArray: true,
    }),
    ApiOkResponseTemplate({
      description: '덮어쓰여질 레코드 목록',
      type: InstructorResponseDto,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};
