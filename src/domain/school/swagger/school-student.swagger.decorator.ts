import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
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
  sortableColumns: ['grade', 'klass', 'bunho'],
  searchableColumns: ['name', 'parent.phone'],
  defaultSortBy: [
    ['grade', 'ASC'],
    ['klass', 'ASC'],
    ['bunho', 'ASC'],
  ],
  filterableColumns: {
    grade: [FilterOperator.EQ],
    class: [FilterOperator.EQ],
    bunho: [FilterOperator.EQ],
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
      summary: '🟢 학교 학생 일괄 생성/수정 (엑셀 업로드)',
      description: `
**📝 기능 설명**
- 학교에 속한 여러 학생을 한 번에 생성하거나 수정합니다
- Upsert 방식으로 동작하여 기존 학생 정보가 있으면 업데이트, 없으면 새로 생성
- 엑셀 파일 업로드를 통한 대량 학생 등록 시 주로 사용됩니다

**🔄 비즈니스 로직**
1. 학교ID + 학년 + 반 + 학번 조합으로 고유성 검증
2. 이미 존재하는 학생은 정보 업데이트, 새로운 학생은 생성
3. 학부모 정보도 함께 생성/업데이트 (연락처 기반 매칭)
4. 처리된 학생 수를 반환

**⚠️ 중요 제약사항**
- schoolId + grade + class + bunho 조합은 반드시 유니크
- 학생 이름은 필수 입력 (2-10자)
- 학년은 1-6학년 범위 내
- 반은 1-20 범위 내 문자열
- 학번은 1-50 범위 내 정수
- 전화번호는 010으로 시작하는 11자리 숫자

**📚 예시 시나리오**
- 신학기 시작 전 전체 학생 명단 일괄 등록
- 중간 전학생 추가 등록
- 기존 학생 정보 대량 수정 (반 이동, 연락처 변경 등)
- 졸업/전학으로 인한 학생 상태 변경
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 학생을 등록할 학교의 고유 식별자',
      example: 1,
    }),
    ApiBody({
      type: [CreateStudentDto],
      description: '생성/수정할 학생 정보 배열',
      examples: {
        singleStudent: {
          summary: '단일 학생 등록',
          value: [
            {
              schoolId: 1,
              grade: 3,
              class: '2',
              bunho: 15,
              name: '홍길동',
              phone: '01012345678',
              escortPhone: '01087654321',
              status: 'ATTENDING',
              parent: {
                phone: '01098765432',
              },
            },
          ],
        },
        multipleStudents: {
          summary: '여러 학생 동시 등록',
          value: [
            {
              schoolId: 1,
              grade: 3,
              class: '2',
              bunho: 15,
              name: '홍길동',
              phone: '01012345678',
              escortPhone: '01087654321',
              status: 'ATTENDING',
              parent: {
                phone: '01098765432',
              },
            },
            {
              schoolId: 1,
              grade: 2,
              class: '1',
              bunho: 8,
              name: '김영희',
              phone: '01023456789',
              escortPhone: '01076543210',
              status: 'ATTENDING',
              parent: {
                phone: '01065432109',
              },
            },
          ],
        },
        classTransfer: {
          summary: '반 이동 처리',
          value: [
            {
              schoolId: 1,
              grade: 4,
              class: '3',
              bunho: 22,
              name: '이수현',
              phone: '01034567890',
              status: 'ATTENDING',
              parent: {
                phone: '01054321098',
              },
            },
          ],
        },
      },
    }),
    ApiCreatedResponse({
      description: '학생 일괄 등록 완료 - 처리된 학생 수 반환',
      schema: {
        type: 'number',
        example: 2,
        description: '성공적으로 생성/업데이트된 학생 수',
      },
    }),
    ApiResponse({
      status: 400,
      description: '요청 데이터 검증 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: [
              '학년은 1 이상 6 이하여야 합니다',
              '학생 이름은 2자 이상 10자 이하여야 합니다',
              '전화번호 형식이 올바르지 않습니다',
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학교',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'School not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학생 Excel 업로드
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolStudentExcelUploadDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📊 Excel 파일로 학생 일괄 등록',
      description: `
**📝 기능 설명**
- Excel 파일을 업로드하여 학생 정보를 일괄 등록/수정합니다
- 파일의 첫 번째 시트에서 학생 데이터를 읽어옵니다
- 3번째 행부터 실제 데이터로 인식합니다 (1-2행은 헤더)

**📋 Excel 파일 형식**
- **A열**: 빈 열 (인덱스)
- **B열**: 학생 이름 (필수)
- **C열**: 학년 (1-6)
- **D열**: 반 (문자열)
- **E열**: 학번 (1-50)
- **F열**: 학부모 전화번호 (010으로 시작하는 11자리)
- **G열**: 학생 전화번호 (선택사항)
- **H열**: 비고 (선택사항)

**🔄 비즈니스 로직**
1. Excel 파일 파싱 및 데이터 검증
2. schoolId + grade + class + bunho 조합으로 중복 체크
3. 기존 학생은 정보 업데이트, 새로운 학생은 생성
4. 학부모 정보도 함께 생성/업데이트
5. 처리된 학생 수 반환

**⚠️ 중요 제약사항**
- 파일은 반드시 .xlsx 형식이어야 함
- 학생 이름은 필수 입력 (빈 행은 무시)
- 학년은 1-6 범위 내 숫자
- 반은 문자열 형태 (예: "1", "2", "A", "B")
- 학번은 1-50 범위 내 숫자
- 전화번호는 010으로 시작하는 11자리

**📚 예시 시나리오**
- 신학기 전체 학생 명단 일괄 등록
- 중간 전학생 추가 등록
- 기존 학생 정보 대량 수정
- 학급별 학생 명단 업데이트
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 학생을 등록할 학교의 고유 식별자',
      example: 1,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Excel 파일 (.xlsx) - 학생 정보가 포함된 파일',
          },
        },
        required: ['file'],
      },
    }),
    ApiCreatedResponse({
      description: 'Excel 파일 업로드 및 학생 일괄 등록 완료',
      schema: {
        type: 'number',
        example: 25,
        description: '성공적으로 처리된 학생 수',
      },
    }),
    ApiResponse({
      status: 400,
      description: '파일 업로드 실패 또는 데이터 검증 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: '파일이 업로드되지 않았습니다.',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학교',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'School not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
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
      summary: '🔍 학교 학생 일괄 생성 시뮬레이션 (Dry Run)',
      description: `
**📝 기능 설명**
- 실제 데이터를 생성하지 않고 학생 일괄 등록 시뮬레이션을 수행합니다
- 중복되는 학생이 있는지 사전에 확인하여 Upsert 여부를 판단합니다
- 엑셀 업로드 전 데이터 검증용으로 주로 사용됩니다

**🔄 비즈니스 로직**
1. 요청된 학생 데이터의 유효성 검증
2. 기존 데이터베이스와 중복 체크
3. 덮어쓰여질 기존 학생 레코드 반환
4. 실제 데이터 변경 없이 결과만 시뮬레이션

**⚠️ 중요 제약사항**
- 실제 데이터베이스에는 변경사항이 적용되지 않음
- schoolId + grade + class + bunho 기준으로 중복 검사
- 반환된 배열이 비어있으면 새로운 학생들만 등록 예정
- 반환된 배열에 데이터가 있으면 해당 학생들이 업데이트 예정

**📚 예시 시나리오**
- 엑셀 파일 업로드 전 중복 학생 확인
- 대량 데이터 입력 전 검증 작업
- 기존 학생 정보가 변경될지 미리 확인
- 데이터 정합성 검증 후 실제 등록 결정
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 시뮬레이션을 수행할 학교의 고유 식별자',
      example: 1,
    }),
    ApiBody({
      type: [CreateStudentDto],
      description: '시뮬레이션할 학생 정보 배열',
      examples: {
        duplicateCheck: {
          summary: '중복 검사 시나리오',
          value: [
            {
              schoolId: 1,
              grade: 3,
              class: '2',
              bunho: 15,
              name: '홍길동',
              phone: '01012345678',
              status: 'ATTENDING',
              parent: {
                phone: '01098765432',
              },
            },
          ],
        },
        newStudents: {
          summary: '신규 학생들 등록 예정',
          value: [
            {
              schoolId: 1,
              grade: 1,
              class: '1',
              bunho: 1,
              name: '신입생1',
              phone: '01011111111',
              status: 'ATTENDING',
              parent: {
                phone: '01022222222',
              },
            },
            {
              schoolId: 1,
              grade: 1,
              class: '1',
              bunho: 2,
              name: '신입생2',
              phone: '01033333333',
              status: 'ATTENDING',
              parent: {
                phone: '01044444444',
              },
            },
          ],
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '중복 학생 시뮬레이션 결과 - 덮어쓰여질 기존 학생 목록',
      type: Student,
      isArray: true,
    }),
    ApiResponse({
      status: 200,
      description: '시뮬레이션 성공 - 빈 배열은 새로운 학생만 등록됨을 의미',
      schema: {
        type: 'array',
        items: { $ref: '#/components/schemas/Student' },
        example: [],
        description:
          '빈 배열: 중복 없음, 데이터 있음: 해당 학생들이 업데이트됨',
      },
    }),
    ApiResponse({
      status: 400,
      description: '시뮬레이션 데이터 검증 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: ['학교 ID는 필수입니다', '학년은 1-6 사이여야 합니다'],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
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
      summary: '📊 학교 학년별 반 구성 정보 조회',
      description: `
**📝 기능 설명**
- 지정된 학교의 학년별 반 구성 현황을 조회합니다
- 실제 학생이 등록된 학년과 반 조합만을 반환합니다
- 프론트엔드에서 드롭다운 메뉴나 필터 옵션 구성에 활용됩니다

**🔄 비즈니스 로직**
1. 해당 학교에 등록된 모든 학생을 학년별로 그룹화
2. 각 학년 내에서 실제 존재하는 반들을 수집
3. 학년별로 반 목록을 정렬하여 반환
4. 빈 학년이나 반은 결과에서 제외

**📊 응답 데이터 구조**
- 학년별로 해당 학년에 속한 반들의 목록
- 숫자 학년과 문자열 반명의 조합
- 학년 오름차순, 반명 오름차순으로 정렬

**🔍 활용 예시**
- 학생 등록 시 학년/반 선택 옵션 제공
- 출석부 생성을 위한 반 목록 조회
- 학급별 통계 생성을 위한 기초 데이터
- 학사 관리 시스템의 네비게이션 구성
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 반 구성을 조회할 학교의 고유 식별자',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '학교 학년별 반 구성 정보 조회 완료',
      type: ResponseSchoolGradesDto,
      isArray: true,
    }),
    ApiResponse({
      status: 200,
      description: '학년별 반 정보 조회 성공',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            grade: {
              type: 'number',
              example: 3,
              description: '학년 (1-6)',
            },
            classes: {
              type: 'array',
              items: { type: 'string' },
              example: ['1', '2', '3', '4'],
              description: '해당 학년의 반 목록',
            },
          },
        },
        example: [
          { grade: 1, classes: ['1', '2', '3'] },
          { grade: 2, classes: ['1', '2', '3', '4'] },
          { grade: 3, classes: ['1', '2', '3'] },
          { grade: 4, classes: ['1', '2'] },
          { grade: 5, classes: ['1', '2', '3'] },
          { grade: 6, classes: ['1', '2'] },
        ],
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학교 또는 학생 없음',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: {
            type: 'string',
            example: 'School not found or no students',
          },
          error: { type: 'string', example: 'Not Found' },
        },
      },
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
      summary: '👥 학교 전체 학생 목록 조회',
      description: `
**📝 기능 설명**
- 지정된 학교의 모든 학생 정보를 한 번에 조회합니다
- 학생과 학부모 정보, 수강신청 현황이 모두 포함됩니다
- 페이지네이션 없이 전체 데이터를 반환합니다

**🔄 비즈니스 로직**
1. 학교별 전체 학생 조회 (재학, 졸업, 전학 포함)
2. 학부모 정보 조인으로 연락처 정보 포함
3. Pick 정보 조인으로 수강 현황 포함
4. 학년 → 반 → 학번 순으로 자동 정렬

**📊 응답 데이터**
- **Student 정보**: 기본 학생 정보, 연락처, 상태
- **Parent 정보**: 학부모 연락처, 앱 사용 여부 (userId 기준)
- **Picks 정보**: 수강 중인 강좌 목록

**💡 앱 사용 여부 판단**
- parent.userId가 null: 앱 미사용 학부모
- parent.userId가 존재: 앱 사용 중인 학부모

**🔍 활용 예시**
- 전체 학생 명단 출력
- 학급별 연락망 생성
- 수강신청 현황 전체 파악
- 학사 관리 시스템 초기 데이터 로드
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 학생 목록을 조회할 학교의 고유 식별자',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '학교 전체 학생 목록 조회 완료',
      type: Student,
      isArray: true,
    }),
    ApiResponse({
      status: 200,
      description: '학생 목록 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: '#/components/schemas/Student' },
        example: [
          {
            id: 1,
            name: '홍길동',
            grade: 3,
            class: '2',
            bunho: 15,
            phone: '01012345678',
            escortPhone: '01087654321',
            status: 'ATTENDING',
            parent: {
              id: 1,
              phone: '01098765432',
              userId: 123,
            },
            picks: [
              {
                id: 1,
                groupId: 5,
                start: '2025-03-01',
                end: '2025-08-31',
                bookFee: 15000,
                materialFee: 8000,
              },
            ],
          },
        ],
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학교',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'School not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학생 리스트 (paginated)
//? ---------------------------------------------------------------------- ?//

export const SchoolStudentListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 학교 학생 목록 페이지네이션 조회 (검색/필터/정렬)',
      description: `
**📝 기능 설명**
- 대량의 학생 데이터를 페이지네이션으로 효율적으로 조회합니다
- 강력한 검색, 필터링, 정렬 기능을 제공합니다
- 학생과 학부모 정보, 수강신청 현황이 모두 포함됩니다

**🔍 검색 기능**
- **search**: 다음 필드에서 키워드 검색 가능
  - \`name\`: 학생 이름
  - \`parent.phone\`: 학부모 전화번호
  - \`escortPhone\`: 보호자 전화번호
- **예시**: \`?search=홍길동\`, \`?search=01012345678\`

**🎯 필터링 기능**
- **grade**: 학년별 필터 (\`?filter.grade=3\`)
- **class**: 반별 필터 (\`?filter.class=2\`)
- **bunho**: 학번별 필터 (\`?filter.bunho=15\`)
- **name**: 이름 정확 매치 또는 부분 매치 (\`?filter.name=홍길동\`)
- **status**: 학생 상태별 필터 (\`?filter.status=ATTENDING\`)
- **복합 필터**: \`?filter.grade=3&filter.class=2\`

**📊 정렬 기능**
- **기본 정렬**: 학년 → 반 → 학번 순 (ASC)
- **커스텀 정렬**: \`?sortBy=grade:DESC&sortBy=class:ASC\`
- **정렬 가능 필드**: grade, class, bunho

**📱 앱 사용 여부 판단**
- parent.userId가 null: 앱 미사용 학부모
- parent.userId가 존재: 앱 사용 중인 학부모

**📊 쿼리 파라미터 예시**
- \`?page=1&limit=20\`: 첫 페이지, 20개씩
- \`?search=김&filter.grade=3\`: 이름에 '김'이 포함된 3학년 학생
- \`?filter.status=ATTENDING&sortBy=name:ASC\`: 재학생만 이름순 정렬
- \`?filter.grade=IN:1,2,3\`: 1-3학년 학생만 조회

**🔍 활용 예시**
- 학급별 학생 관리
- 연락처 기반 학생 검색
- 상태별 학생 현황 파악
- 무한 스크롤 형태의 학생 목록
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 학생 목록을 조회할 학교의 고유 식별자',
      example: 1,
    }),
    ApiPaginationQuery(SCHOOL_STUDENT_CONFIG),
    ApiOkPaginatedResponse(Student, SCHOOL_STUDENT_CONFIG),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학교',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'School not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학생 날짜별 그룹 조회
//? ---------------------------------------------------------------------- ?//

export const GetSchoolStudentGroupsForDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 학생 특정 날짜 수업 그룹 조회',
      description: `
**📝 기능 설명**
- 특정 학생이 특정 날짜에 참여하는 수업 그룹들을 조회합니다
- 날짜별 시간표 생성이나 출석 관리에 활용됩니다
- 수업 시간 순으로 정렬되어 반환됩니다

**🔄 비즈니스 로직**
1. 학생의 모든 Pick (수강신청) 정보 조회
2. 지정된 날짜의 요일과 매치되는 수업 그룹 필터링
3. 수업 기간(start ~ end)에 해당 날짜가 포함되는지 확인
4. 수업 시작 시간 순으로 정렬하여 반환

**⚠️ 중요 제약사항**
- date 파라미터는 YYYY-MM-DD 형식 필수
- 해당 날짜가 수업 기간 내에 포함되어야 함
- 해당 요일에 수업이 있는 그룹만 반환
- 학생이 해당 그룹에 Pick(등록)되어 있어야 함

**📊 반환 데이터**
- **Group 정보**: 그룹 기본 정보 (이름, 정원 등)
- **Lesson 정보**: 수업 상세 정보 (시간, 장소, 강사 등)
- **시간 정렬**: 수업 시작 시간 오름차순

**🔍 활용 예시**
- 학생별 일일 시간표 생성
- 특정 날짜 출석 체크 대상 그룹 조회
- 학생의 수업 스케줄 확인
- 충돌 시간 검사 및 스케줄 관리
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 조회할 학교의 고유 식별자',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID - 시간표를 조회할 학생의 고유 식별자',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: String,
      description: '조회할 날짜 - YYYY-MM-DD 형식의 날짜 문자열',
      example: '2025-03-15',
    }),
    ApiOkResponseTemplate({
      description: '학생 특정 날짜 수업 그룹 조회 완료',
      type: Group,
      isArray: true,
    }),
    ApiResponse({
      status: 200,
      description: '학생 날짜별 그룹 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: '#/components/schemas/Group' },
        example: [
          {
            id: 5,
            groupName: '영어회화 A반',
            maxStudents: 20,
            currentStudents: 15,
            lesson: {
              id: 1,
              lessonName: '영어회화 초급',
              weekday: 'FRIDAY',
              startTime: '09:00',
              endTime: '10:30',
              location: '영어실',
              sam: {
                id: 1,
                name: '김영어',
                phone: '01012345678',
              },
            },
          },
          {
            id: 8,
            groupName: '수학 심화반',
            maxStudents: 15,
            currentStudents: 12,
            lesson: {
              id: 3,
              lessonName: '수학 심화과정',
              weekday: 'FRIDAY',
              startTime: '14:00',
              endTime: '15:30',
              location: '수학실',
              sam: {
                id: 2,
                name: '박수학',
                phone: '01087654321',
              },
            },
          },
        ],
      },
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 날짜 형식',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'Invalid date format. Use YYYY-MM-DD',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학교 또는 학생',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'School or Student not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학생 Excel 다운로드
//? ---------------------------------------------------------------------- ?//

export const DownloadSchoolStudentExcelDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📥 학생 목록 Excel 파일 다운로드',
      description: `
**📝 기능 설명**
- 학교의 전체 학생 목록을 Excel 파일(.xlsx)로 다운로드합니다
- 학생 정보와 학부모 정보가 포함된 완전한 명단을 제공합니다
- 파일명은 'students-YYYY-MM-DD.xlsx' 형식으로 자동 생성됩니다

**📋 Excel 파일 구성**
- **A열**: 빈 열 (인덱스)
- **B열**: 학생 이름
- **C열**: 학년 (1-6)
- **D열**: 반 (문자열)
- **E열**: 학번 (1-50)
- **F열**: 학부모 전화번호 (010으로 시작하는 11자리)
- **G열**: 학생 전화번호 (선택사항)
- **H열**: 비고 (선택사항)

**🔄 비즈니스 로직**
1. 학교 ID로 해당 학교의 모든 학생 조회
2. 학년 → 반 → 학번 순으로 정렬
3. Excel 워크북 생성 및 데이터 입력
4. 파일 스트림으로 응답 전송

**📚 예시 시나리오**
- 신학기 학생 명단 백업
- 학부모 상담용 학생 명단 제공
- 학생 정보 수정을 위한 템플릿 생성
- 학교 행정 업무용 학생 명단

**⚠️ 중요 사항**
- 파일은 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet 형식
- Content-Disposition 헤더로 파일명 지정
- 대용량 데이터의 경우 스트리밍 방식으로 처리
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 학생 목록을 다운로드할 학교의 고유 식별자',
      example: 1,
    }),
    ApiResponse({
      status: 200,
      description: 'Excel 파일 다운로드 성공',
      schema: {
        type: 'string',
        format: 'binary',
        description: '학생 목록이 포함된 Excel 파일 (.xlsx)',
      },
      headers: {
        'Content-Type': {
          description: 'Excel 파일 MIME 타입',
          schema: {
            type: 'string',
            example:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        },
        'Content-Disposition': {
          description: '파일 다운로드 헤더',
          schema: {
            type: 'string',
            example: 'attachment; filename="students-2025-03-15.xlsx"',
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학교',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'School not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
