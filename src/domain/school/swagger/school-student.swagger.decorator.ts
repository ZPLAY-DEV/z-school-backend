import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Group } from '../../group/entities/group.entity';
import { CreateStudentDto } from '../../student/dto/create-student.dto';
import { Student } from '../../student/entities/student.entity';
import { ResponseSchoolGradesDto } from '../dto/response-school-grades.dto';

const SCHOOL_STUDENT_CONFIG: PaginateConfig<Student> = {
  relations: {
    parent: true,
    picks: true,
  },
  sortableColumns: ['grade', 'class', 'studentCode'],
  searchableColumns: ['name', 'parent.phone', 'escortPhone'],
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
};

//? ---------------------------------------------------------------------- ?//
//? 학생 일괄 생성
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolStudentBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 일괄 생성',
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
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학생 일괄 생성 (dryrun)
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolStudentsBulkDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 bulk 생성 (dryrun)',
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
      type: Student,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학교 학년별 반 정보 조회
//? ---------------------------------------------------------------------- ?//

export const SchoolStudentGradesDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 학년별 반 정보 조회',
      description: `
      - 해당 학교의 학년별 반 정보를 조회
      - 각 학년에 속한 반 목록을 반환
      - 학생이 실제로 존재하는 학년/반 조합만 반환됨
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkResponseTemplate({
      description: '학교 학년별 반 정보 조회 완료',
      type: ResponseSchoolGradesDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학생 리스트
//? ---------------------------------------------------------------------- ?//

export const SchoolStudentListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 리스트',
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
      type: Student,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학생 리스트 (paginated)
//? ---------------------------------------------------------------------- ?//

export const SchoolStudentListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 리스트 & 검색 & 필터 (페이징)',
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
    ApiPaginationQuery(SCHOOL_STUDENT_CONFIG),
    ApiOkPaginatedResponse(Student, SCHOOL_STUDENT_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학생 날짜별 그룹 조회
//? ---------------------------------------------------------------------- ?//

export const GetSchoolStudentGroupsForDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 날짜별 그룹 조회',
      description: `
      - 특정 날짜에 특정 학생이 속한 그룹들을 조회
      - date 파라미터가 제공되면 해당 날짜의 요일과 수강 기간에 맞는 그룹만 반환
      - date 파라미터가 없으면 학생이 속한 모든 그룹 반환
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
    }),
    ApiParam({
      name: 'date',
      type: String,
      description: '날짜 (YYYY-MM-DD 형식)',
      example: '2024-03-15',
    }),
    ApiOkResponseTemplate({
      description: '학생 날짜별 그룹 조회 완료',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
