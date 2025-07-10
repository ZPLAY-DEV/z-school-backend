import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiOkPaginatedResponse } from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateSamDto } from '../../sam/dto/create-sam.dto';
import { Sam } from '../../sam/entities/sam.entity';

//? ---------------------------------------------------------------------- ?//
//? Create School Sam Bulk
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolSamBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🟢 학교 강사 일괄 생성/수정 (계약서 업로드)',
      description: `
**📝 기능 설명**
- 특정 학교에 소속된 강사들을 한 번에 생성하거나 수정합니다
- Upsert 방식으로 동작하여 기존 강사 정보가 있으면 업데이트, 없으면 새로 생성
- 계약서 기반 강사 정보 일괄 등록 시 주로 사용됩니다

**🔄 비즈니스 로직**
1. 이름 + 전화번호 조합으로 기존 강사 중복 체크
2. 중복된 강사는 정보 업데이트, 새로운 강사는 생성
3. 학교별 강사 소속 관계 설정
4. 처리된 강사 목록을 반환

**⚠️ 중요 제약사항**
- 강사 이름은 필수 입력 (2-10자)
- 전화번호는 010으로 시작하는 11자리 숫자 필수
- 이메일은 유효한 형식이어야 함
- 전문분야는 최대 50자
- 경력은 최대 100자

**📚 예시 시나리오**
- 신학기 시작 전 전체 강사진 일괄 등록
- 신규 강사 추가 등록
- 기존 강사 정보 대량 수정 (연락처, 전문분야 변경 등)
- 계약 갱신에 따른 강사 정보 업데이트
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 강사를 등록할 학교의 고유 식별자',
      example: 1,
    }),
    ApiBody({
      type: [CreateSamDto],
      description: '생성/수정할 강사 정보 배열',
      examples: {
        singleSam: {
          summary: '단일 강사 등록',
          value: [
            {
              name: '김영어',
              phone: '01012345678',
              email: 'kim.english@example.com',
              alias: '김영어쌤',
              specialty: '영어교육, TESOL',
              career: '초등학교 영어교육 10년, 원어민 강사 경험 5년',
              note: '미국 거주 경험으로 원어민 수준의 발음',
            },
          ],
        },
        multipleSams: {
          summary: '여러 강사 동시 등록',
          value: [
            {
              name: '김영어',
              phone: '01012345678',
              email: 'kim.english@example.com',
              alias: '김영어쌤',
              specialty: '영어교육, TESOL',
              career: '초등학교 영어교육 10년',
              note: '미국 거주 경험',
            },
            {
              name: '박수학',
              phone: '01087654321',
              email: 'park.math@example.com',
              alias: '박수학쌤',
              specialty: '수학교육, 수학올림피아드',
              career: '중등수학 교사 15년, 수학올림피아드 지도',
              note: '창의적 수학 교육 전문',
            },
            {
              name: '이미술',
              phone: '01055556666',
              email: 'lee.art@example.com',
              alias: '이미술쌤',
              specialty: '미술교육, 창의미술',
              career: '미대 졸업 후 아동미술 교육 8년',
              note: '아이들의 창의성 발달에 중점',
            },
          ],
        },
        contractRenewal: {
          summary: '계약 갱신에 따른 정보 업데이트',
          value: [
            {
              name: '최체육',
              phone: '01099998888',
              email: 'choi.sports@example.com',
              alias: '최체육쌤',
              specialty: '체육교육, 축구코칭',
              career: '체육교사 12년, 축구 선수 출신',
              note: '2025년 계약 갱신 - 급여 조정',
            },
          ],
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '강사 일괄 등록 완료 - 생성/수정된 강사 목록 반환',
      type: Sam,
      isArray: true,
    }),
    ApiResponse({
      status: 201,
      description: '강사 일괄 등록 성공',
      schema: {
        type: 'array',
        items: { $ref: '#/components/schemas/Sam' },
        example: [
          {
            id: 1,
            name: '김영어',
            phone: '01012345678',
            email: 'kim.english@example.com',
            alias: '김영어쌤',
            specialty: '영어교육, TESOL',
            career: '초등학교 영어교육 10년',
            status: 'ACTIVE',
            createdAt: '2025-01-15T09:00:00.000Z',
            updatedAt: '2025-01-15T09:00:00.000Z',
          },
        ],
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
              '강사 이름은 2자 이상 10자 이하여야 합니다',
              '전화번호 형식이 올바르지 않습니다',
              '이메일 형식이 올바르지 않습니다',
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
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create School Sam Bulk DryRun
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolSamBulkDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 학교 강사 일괄 생성 시뮬레이션 (Dry Run)',
      description: `
**📝 기능 설명**
- 실제 데이터를 생성하지 않고 강사 일괄 등록 시뮬레이션을 수행합니다
- 중복되는 강사가 있는지 사전에 확인하여 Upsert 여부를 판단합니다
- 계약서 업로드 전 데이터 검증용으로 주로 사용됩니다

**🔄 비즈니스 로직**
1. 요청된 강사 데이터의 유효성 검증
2. 기존 데이터베이스와 중복 체크 (이름 + 전화번호 기준)
3. 덮어쓰여질 기존 강사 레코드 반환
4. 실제 데이터 변경 없이 결과만 시뮬레이션

**⚠️ 중요 제약사항**
- 실제 데이터베이스에는 변경사항이 적용되지 않음
- 이름 + 전화번호 기준으로 중복 검사
- 반환된 배열이 비어있으면 새로운 강사들만 등록 예정
- 반환된 배열에 데이터가 있으면 해당 강사들이 업데이트 예정

**📚 예시 시나리오**
- 계약서 업로드 전 중복 강사 확인
- 대량 데이터 입력 전 검증 작업
- 기존 강사 정보가 변경될지 미리 확인
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
      type: [CreateSamDto],
      description: '시뮬레이션할 강사 정보 배열',
      examples: {
        duplicateCheck: {
          summary: '중복 검사 시나리오',
          value: [
            {
              name: '김영어',
              phone: '01012345678',
              email: 'kim.english@example.com',
              alias: '김영어쌤',
              specialty: '영어교육',
              career: '10년',
            },
          ],
        },
        newSams: {
          summary: '신규 강사들 등록 예정',
          value: [
            {
              name: '신규강사1',
              phone: '01011111111',
              email: 'new1@example.com',
              alias: '신규쌤1',
              specialty: '국어교육',
              career: '5년',
            },
            {
              name: '신규강사2',
              phone: '01022222222',
              email: 'new2@example.com',
              alias: '신규쌤2',
              specialty: '과학교육',
              career: '3년',
            },
          ],
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '중복 강사 시뮬레이션 결과 - 덮어쓰여질 기존 강사 목록',
      type: Sam,
      isArray: true,
    }),
    ApiResponse({
      status: 200,
      description: '시뮬레이션 성공 - 빈 배열은 새로운 강사만 등록됨을 의미',
      schema: {
        type: 'array',
        items: { $ref: '#/components/schemas/Sam' },
        example: [],
        description:
          '빈 배열: 중복 없음, 데이터 있음: 해당 강사들이 업데이트됨',
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
            example: [
              '강사 이름은 필수입니다',
              '전화번호 형식이 올바르지 않습니다',
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? School Sam List
//? ---------------------------------------------------------------------- ?//

export const SchoolSamListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👨‍🏫 학교 전체 강사 목록 조회',
      description: `
**📝 기능 설명**
- 지정된 학교에 소속된 모든 강사 정보를 한 번에 조회합니다
- 강사 기본 정보와 계약 상태, 담당 수업 정보가 포함됩니다
- 페이지네이션 없이 전체 데이터를 반환합니다

**🔄 비즈니스 로직**
1. 학교별 전체 강사 조회 (활성, 비활성 포함)
2. 강사 기본 정보 및 계약 정보 포함
3. 강사명 오름차순으로 자동 정렬
4. 관련 수업 및 그룹 정보 조인

**📊 응답 데이터**
- **Sam 정보**: 기본 강사 정보, 연락처, 전문분야
- **Contract 정보**: 계약 상태, 급여 정보
- **수업 연결**: 담당하는 수업 및 그룹 정보

**🔍 활용 예시**
- 전체 강사진 명단 출력
- 강사별 연락망 생성
- 수업 배정 현황 파악
- 계약 관리 시스템 초기 데이터 로드
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 강사 목록을 조회할 학교의 고유 식별자',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '학교 전체 강사 목록 조회 완료',
      type: Sam,
      isArray: true,
    }),
    ApiResponse({
      status: 200,
      description: '강사 목록 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: '#/components/schemas/Sam' },
        example: [
          {
            id: 1,
            name: '김영어',
            phone: '01012345678',
            email: 'kim.english@example.com',
            alias: '김영어쌤',
            specialty: '영어교육, TESOL',
            career: '초등학교 영어교육 10년',
            status: 'ACTIVE',
            contracts: [
              {
                id: 1,
                termId: 1,
                hourlyRate: 50000,
                status: 'ACTIVE',
              },
            ],
          },
          {
            id: 2,
            name: '박수학',
            phone: '01087654321',
            email: 'park.math@example.com',
            alias: '박수학쌤',
            specialty: '수학교육',
            career: '중등수학 교사 15년',
            status: 'ACTIVE',
            contracts: [
              {
                id: 2,
                termId: 1,
                hourlyRate: 55000,
                status: 'ACTIVE',
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
//? School Sam Paginated
//? ---------------------------------------------------------------------- ?//

export const SchoolSamPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👨‍🏫📄 학교 강사 목록 페이지네이션 조회 (검색/정렬)',
      description: `
**📝 기능 설명**
- 대량의 강사 데이터를 페이지네이션으로 효율적으로 조회합니다
- 검색 및 정렬 기능을 제공합니다
- 무한스크롤 방식의 페이지네이션을 지원합니다

**🔍 검색 기능**
- **search**: 다음 필드에서 키워드 검색 가능
  - \`name\`: 강사 이름
  - \`alias\`: 강사 별명
  - \`specialty\`: 전문분야
  - \`email\`: 이메일 주소
- **예시**: \`?search=김영어\`, \`?search=영어교육\`

**📊 정렬 기능**
- **기본 정렬**: 강사 ID 내림차순 (최신 등록순)
- **커스텀 정렬**: \`?sortBy=name:ASC\` (이름 오름차순)
- **정렬 가능 필드**: id, name, alias

**📊 쿼리 파라미터 예시**
- \`?page=1&limit=20\`: 첫 페이지, 20개씩
- \`?search=영어&sortBy=name:ASC\`: '영어' 키워드 검색, 이름순 정렬
- \`?sortBy=id:DESC\`: 최신 등록 강사순 정렬

**🔍 활용 예시**
- 강사 관리 화면에서 검색/필터링
- 수업 배정 시 강사 선택
- 계약 관리를 위한 강사 조회
- 무한 스크롤 형태의 강사 목록
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID - 강사 목록을 조회할 학교의 고유 식별자',
      example: 1,
    }),
    ApiOkPaginatedResponse(Sam, {
      sortableColumns: ['id', 'alias'],
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
