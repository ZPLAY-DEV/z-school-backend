import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiResponse,
    getSchemaPath,
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
import { Student } from 'src/domain/student/entities/student.entity';
import { UpdateParentDto } from '../dto/update-parent.dto';
import { Parent } from '../entities/parent.entity';

const PAGINATED_PARENT_CONFIG: PaginateConfig<Parent> = {
  relations: {
    students: true,
  },
  sortableColumns: ['createdAt'],
  searchableColumns: ['name'],
  defaultSortBy: [['createdAt', 'DESC']],
  filterableColumns: {
    id: [FilterOperator.EQ, FilterOperator.IN],
    name: [FilterOperator.EQ, FilterOperator.ILIKE],
    phone: [FilterOperator.EQ, FilterOperator.ILIKE],
    userId: [FilterOperator.EQ, FilterOperator.NULL],
  },
};

//? ---------------------------------------------------------------------- ?//
//? Find All Parents (Paginated)
//? ---------------------------------------------------------------------- ?//

export const FindAllParentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔍 학부모 목록 조회 (페이지네이션)',
      description: `
**📝 기능 설명**
- 등록된 학부모 목록을 페이지네이션으로 조회합니다
- 각 학부모와 연결된 학생 정보도 함께 제공됩니다
- 다양한 필터링 및 정렬 옵션을 지원합니다

**🔄 비즈니스 로직**
1. 기본적으로 생성일시 기준 내림차순 정렬
2. 학부모 이름 또는 전화번호로 검색 가능
3. userId 유무로 회원가입 여부 구분 가능
4. 연결된 학생들의 기본 정보 포함

**📊 필터링 옵션**
- \`id\`: 특정 학부모 ID 또는 복수 ID로 필터링
- \`name\`: 학부모 이름으로 정확히 일치하거나 부분 검색
- \`phone\`: 전화번호로 정확히 일치하거나 부분 검색
- \`userId\`: 회원가입 여부 (null이면 미가입, 숫자면 가입)

**📚 사용 시나리오**
- 학부모 관리 페이지에서 목록 표시
- 특정 조건의 학부모들 검색 및 필터링
- 미가입 학부모들의 회원가입 독려 대상 파악
      `,
    }),
    ApiPaginationQuery(PAGINATED_PARENT_CONFIG),
    ApiOkPaginatedResponse(Parent, PAGINATED_PARENT_CONFIG),
    ApiResponse({
      status: 400,
      description: '잘못된 쿼리 파라미터',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: [
              '페이지 번호는 1 이상이어야 합니다',
              '정렬 필드가 유효하지 않습니다',
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Find Parent
//? ---------------------------------------------------------------------- ?//

export const FindParentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👤 학부모 상세 조회',
      description: `
**📝 기능 설명**
- 특정 학부모의 상세 정보를 조회합니다
- 해당 학부모와 연결된 모든 학생 정보를 포함합니다
- 학부모-학생 관계 파악에 필수적인 정보를 제공합니다

**🔄 비즈니스 로직**
1. 학부모 기본 정보 조회
2. 연결된 학생들의 상세 정보 함께 반환
3. 존재하지 않는 학부모 요청 시 404 에러

**💡 반환 데이터**
- 학부모 기본 정보 (이름, 전화번호, 가입일 등)
- 연결된 학생 목록 (각 학생의 기본 정보 포함)
- 회원가입 여부 및 약관동의 시점

**📚 사용 시나리오**
- 학부모 상세 페이지 표시
- 학부모-학생 관계 확인
- 개별 학부모 정보 수정 전 현재 상태 확인
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 학부모의 고유 식별자',
      example: 123,
    }),
    ApiExtraModels(Parent, Student),
    ApiOkResponse({
      description: '학부모 상세 정보 조회 성공',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Parent) },
          {
            properties: {
              students: {
                type: 'array',
                items: { $ref: getSchemaPath(Student) },
                description: '해당 학부모와 연결된 학생 목록',
              },
            },
          },
        ],
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학부모',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Parent not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Update Parent
//? ---------------------------------------------------------------------- ?//

export const UpdateParentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✏️ 학부모 정보 수정',
      description: `
**📝 기능 설명**
- 기존 학부모의 정보를 부분적으로 수정합니다
- 제공된 필드만 업데이트되며, 나머지 필드는 기존 값 유지
- 전화번호 변경 시 유니크 제약조건 자동 검증

**🔄 비즈니스 로직**
1. 해당 학부모 존재 여부 확인
2. 제공된 필드들로 정보 업데이트
3. 전화번호 변경 시 중복 검사 수행
4. 수정된 학부모 정보 반환

**⚠️ 중요 제약사항**
- 전화번호는 시스템 내에서 유니크해야 함
- 이름은 한글/영문/공백만 허용 (최대 16자)
- 전화번호는 10~11자리 숫자만 허용
- userId는 수정 불가 (시스템 관리 필드)

**📚 수정 가능 시나리오**
- 학부모 이름 변경 (결혼, 개명 등)
- 전화번호 변경 (번호 이동, 기기 교체 등)
- 비고 정보 추가/수정 (특이사항, 연락 시간 등)
- 약관동의 시점 기록/수정
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 학부모의 고유 식별자',
      example: 123,
    }),
    ApiBody({
      type: UpdateParentDto,
      description: '수정할 학부모 정보',
      examples: {
        nameUpdate: {
          summary: '이름만 수정',
          value: {
            name: '김학부모',
          },
        },
        phoneUpdate: {
          summary: '전화번호만 수정',
          value: {
            phone: '01087654321',
          },
        },
        noteUpdate: {
          summary: '비고만 추가',
          value: {
            note: '평일 오후 3시 이후 연락 가능',
          },
        },
        fullUpdate: {
          summary: '전체 정보 수정',
          value: {
            name: '박학부모',
            phone: '01098765432',
            note: '주말에만 연락 가능',
            termsAgreedAt: '2025-01-15T09:30:00Z',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '학부모 정보 수정 완료',
      type: Parent,
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 데이터',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: [
              '전화번호는 10~11자리 숫자만 입력해주세요',
              '이름은 16자 이하여야 합니다',
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학부모',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Parent not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: '전화번호 중복 에러',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 409 },
          message: { type: 'string', example: 'Phone number already exists' },
          error: { type: 'string', example: 'Conflict' },
        },
      },
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.CONFLICT,
    ),
  );

//? ---------------------------------------------------------------------- ?//
//? Delete Parent
//? ---------------------------------------------------------------------- ?//

export const DeleteParentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ 학부모 소프트 삭제',
      description: `
**📝 기능 설명**
- 학부모를 소프트 삭제 처리합니다 (물리적 삭제 아님)
- 삭제된 학부모는 목록에서 제외되지만 데이터는 보존됩니다
- 연결된 학생들과의 관계도 함께 처리됩니다

**🔄 비즈니스 로직**
1. 해당 학부모 존재 여부 확인
2. deletedAt 필드에 현재 시각 설정
3. 소프트 삭제된 학부모 정보 반환
4. 연결된 데이터들은 별도 정책에 따라 처리

**⚠️ 중요 제약사항**
- 물리적 삭제가 아닌 소프트 삭제 (데이터 보존)
- 삭제 후 일반 조회에서는 제외됨
- 연결된 학생 데이터에는 영향 없음
- 복구가 필요한 경우 관리자 권한으로 처리 가능

**💡 삭제 정책**
- 학부모 정보: 소프트 삭제 (복구 가능)
- 학생과의 관계: 유지 (학생 정보는 영향 없음)
- 결제/예약 이력: 보존 (감사 목적)

**📚 삭제 시나리오**
- 모든 자녀 졸업 후 정보 삭제 요청
- 개인정보 삭제 요청 (GDPR 등)
- 중복 계정 정리
- 시스템 정리 작업
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 학부모의 고유 식별자',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '학부모 소프트 삭제 완료',
      type: Parent,
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 학부모',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Parent not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
