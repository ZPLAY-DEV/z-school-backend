import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
    ApiOkPaginatedResponse,
    ApiPaginationQuery,
    FilterOperator,
    PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { CreateInstructorDto } from '../dto/create-instructor.dto';
import { UpdateInstructorDto } from '../dto/update-instructor.dto';

const PAGINATED_INSTRUCTOR_CONFIG: PaginateConfig<Instructor> = {
  sortableColumns: ['id'],
  defaultLimit: 20,
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    userId: [FilterOperator.EQ],
    name: [FilterOperator.EQ, FilterOperator.ILIKE],
    phone: [FilterOperator.EQ, FilterOperator.ILIKE],
    termsAgreedAt: [FilterOperator.NULL],
  },
  relations: {
    sams: {
      school: true,
    },
  },
};

//? ---------------------------------------------------------------------- ?//
//? Find All Instructors (Paginated)
//? ---------------------------------------------------------------------- ?//

export const FindAllInstructorDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔍 강사 목록 조회 (페이지네이션)',
      description: `
**📝 기능 설명**
- 등록된 강사 목록을 페이지네이션으로 조회합니다
- 각 강사와 연결된 Sam(학교별 강사 역할) 정보도 함께 제공됩니다
- 다양한 필터링 및 정렬 옵션을 지원합니다

**🔄 비즈니스 로직**
1. 기본적으로 ID 기준 내림차순 정렬 (최신 등록순)
2. 강사 이름 또는 전화번호로 검색 가능
3. userId 유무로 회원가입 여부 구분 가능
4. 연결된 학교별 강사 역할(Sam) 정보 포함

**📊 필터링 옵션**
- \`userId\`: 회원가입 여부 (null이면 미가입, 숫자면 가입)
- \`name\`: 강사 이름으로 정확히 일치하거나 부분 검색
- \`phone\`: 전화번호로 정확히 일치하거나 부분 검색
- \`termsAgreedAt\`: 약관동의 여부 (null이면 미동의)

**📚 사용 시나리오**
- 강사 관리 페이지에서 목록 표시
- 특정 조건의 강사들 검색 및 필터링
- 미가입 강사들의 회원가입 독려 대상 파악
- 학교별 강사 배치 현황 확인
      `,
    }),
    ApiPaginationQuery(PAGINATED_INSTRUCTOR_CONFIG),
    ApiOkPaginatedResponse(Instructor, PAGINATED_INSTRUCTOR_CONFIG),
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
//? Create School > Instructor
//? ---------------------------------------------------------------------- ?//
export const CreateInstructorDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 강사 생성',
      description: `
      - 학교에 귀속된 강사를 생성한다.
      - 학교에 귀속된 강사의 정보와 강사의 정보가 이미 등록되어 있을 경우 Upsert 된다. ( 업데이트에서도 해당 엔드포인트로 처리 가능 )
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: CreateInstructorDto,
    }),
    ApiCreatedResponseTemplate({
      description: 'Term 생성 완료',
      type: Instructor,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Instructor by ID
//? ---------------------------------------------------------------------- ?//
export const FindInstructorByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👤 강사 상세 조회',
      description: `
**📝 기능 설명**
- 특정 강사의 상세 정보를 조회합니다
- 해당 강사와 연결된 User 및 Sam(학교별 역할) 정보를 포함합니다
- 강사의 전체적인 활동 현황을 파악할 수 있습니다

**🔄 비즈니스 로직**
1. 강사 기본 정보 조회
2. 연결된 사용자 정보 함께 반환 (회원가입한 경우)
3. 학교별 강사 역할(Sam) 정보 함께 반환
4. 존재하지 않는 강사 요청 시 404 에러

**💡 반환 데이터**
- 강사 기본 정보 (이름, 전화번호, 약관동의 등)
- 연결된 User 정보 (회원가입한 경우)
- Sam 목록 (각 학교에서의 강사 역할 정보)

**📚 사용 시나리오**
- 강사 상세 페이지 표시
- 강사의 학교별 역할 및 활동 확인
- 개별 강사 정보 수정 전 현재 상태 확인
- 강사의 수업 및 그룹 관리 현황 파악
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 강사의 고유 식별자',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '강사 상세 정보 조회 성공',
      type: Instructor,
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 강사',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Instructor not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Update Instructor
//? ---------------------------------------------------------------------- ?//
export const UpdateInstructorDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✏️ 강사 정보 수정',
      description: `
**📝 기능 설명**
- 기존 강사의 정보를 부분적으로 수정합니다
- 제공된 필드만 업데이트되며, 나머지 필드는 기존 값 유지
- 전화번호 변경 시 유니크 제약조건 자동 검증

**🔄 비즈니스 로직**
1. 해당 강사 존재 여부 확인
2. 제공된 필드들로 정보 업데이트
3. 전화번호 변경 시 중복 검사 수행
4. 수정된 강사 정보 반환

**⚠️ 중요 제약사항**
- 전화번호는 시스템 내에서 유니크해야 함
- 이름은 한글/영문/공백만 허용 (최대 16자)
- 전화번호는 10~11자리 숫자만 허용
- userId는 수정 불가 (시스템 관리 필드)

**📚 수정 가능 시나리오**
- 강사 이름 변경 (개명, 호칭 변경 등)
- 전화번호 변경 (번호 이동, 기기 교체 등)
- 비고 정보 추가/수정 (특이사항, 연락 시간, 경력 등)
- 약관동의 시점 기록/수정
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 강사의 고유 식별자',
      example: 123,
    }),
    ApiBody({
      type: UpdateInstructorDto,
      description: '수정할 강사 정보',
      examples: {
        nameUpdate: {
          summary: '이름만 수정',
          value: {
            name: '김강사',
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
            note: '수학 전공, 10년 경력',
          },
        },
        fullUpdate: {
          summary: '전체 정보 수정',
          value: {
            name: '박강사',
            phone: '01098765432',
            note: '영어 전문, 원어민 수준',
            termsAgreedAt: '2025-01-15T09:30:00Z',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '강사 정보 수정 완료',
      type: Instructor,
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
      description: '존재하지 않는 강사',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Instructor not found' },
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
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.CONFLICT,
    ),
  );

//? ---------------------------------------------------------------------- ?//
//? Soft Delete Instructor
//? ---------------------------------------------------------------------- ?//
export const SoftDeleteSchoolInstructorDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ 강사 소프트 삭제',
      description: `
**📝 기능 설명**
- 강사를 소프트 삭제 처리합니다 (물리적 삭제 아님)
- 삭제 사유를 note 필드에 기록할 수 있습니다
- 삭제된 강사는 목록에서 제외되지만 데이터는 보존됩니다

**🔄 비즈니스 로직**
1. 해당 강사 존재 여부 확인
2. note가 제공된 경우 삭제 사유와 함께 deletedAt 설정
3. note가 없는 경우 기본 소프트 삭제 처리
4. 연결된 Sam 데이터들은 별도 정책에 따라 처리

**⚠️ 중요 제약사항**
- 물리적 삭제가 아닌 소프트 삭제 (데이터 보존)
- 삭제 후 일반 조회에서는 제외됨
- 연결된 Sam 및 수업 데이터에는 영향 없음
- 복구가 필요한 경우 관리자 권한으로 처리 가능

**💡 삭제 정책**
- 강사 정보: 소프트 삭제 (복구 가능)
- Sam과의 관계: 유지 (학교별 역할 정보는 영향 없음)
- 수업 및 그룹 이력: 보존 (감사 목적)

**📚 삭제 시나리오**
- 강사 퇴사 또는 계약 종료
- 중복 계정 정리
- 시스템 정리 작업
- 개인정보 삭제 요청 (GDPR 등)
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 강사의 고유 식별자',
      example: 123,
    }),
    ApiBody({
      description: '삭제 사유 정보',
      schema: {
        type: 'object',
        properties: {
          note: {
            type: 'string',
            description: '삭제 사유 (선택사항)',
            example: '계약 만료로 인한 퇴사',
            maxLength: 255,
          },
        },
      },
      examples: {
        withNote: {
          summary: '삭제 사유 포함',
          value: {
            note: '계약 만료로 인한 퇴사',
          },
        },
        withoutNote: {
          summary: '사유 없이 삭제',
          value: {},
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '강사 소프트 삭제 완료',
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 강사',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Instructor not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Create Instructor
//? ---------------------------------------------------------------------- ?//
export const CreateInstructorSimpleDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '강사 생성',
      description: '새로운 강사를 생성합니다.',
    }),
    ApiBody({ type: CreateInstructorDto }),
    ApiCreatedResponseTemplate({
      description: '강사 생성 완료',
      type: Instructor,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};
