import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
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
import { CreateManagerDto } from '../dto/create-manager.dto';
import { UpdateManagerDto } from '../dto/update-manager.dto';
import { Manager } from '../entities/manager.entity';

const MANAGER_CONFIG: PaginateConfig<Manager> = {
  sortableColumns: ['id', 'name', 'phone'],
  searchableColumns: ['name'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    phone: [FilterOperator.EQ, FilterOperator.IN, FilterOperator.ILIKE],
  },
};

//? ---------------------------------------------------------------------- ?//
//? Create Manager
//? ---------------------------------------------------------------------- ?//

export const CreateManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👨‍💼 관리자 계정 생성',
      description: `
**📝 기능 설명**
- 새로운 관리자 계정을 생성합니다
- User 계정과 연결하여 관리 권한을 부여합니다

**🔄 비즈니스 로직**
1. userId는 필수이며 기존 Manager와 연결되지 않은 User여야 함
2. schoolId 지정 시 해당 학교의 관리자로 설정
3. 하나의 User는 하나의 Manager 계정만 가능

**⚠️ 중요 제약사항**
- userId 중복 불가 (이미 Manager와 연결된 User 사용 불가)
- schoolName 최대 24자
- phone 번호 중복 체크

**📚 예시 시나리오**
- 새 학교 관리자 계정 생성
- 기존 User를 Manager로 승격
      `,
    }),
    ApiBody({
      type: CreateManagerDto,
      examples: {
        'basic-creation': {
          summary: '기본 관리자 생성',
          value: {
            userId: 1,
            schoolId: 1,
            name: '홍길동',
            phone: '010-1234-5678',
            termsAgreedAt: '2025-01-01T12:00:00Z',
          },
        },
        'detailed-creation': {
          summary: '상세 정보 포함',
          value: {
            userId: 2,
            schoolId: 1,
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            name: '김관리',
            phone: '010-9876-5432',
            note: '시스템 총괄 관리자',
            termsAgreedAt: '2025-01-01T12:00:00Z',
          },
        },
        'minimal-creation': {
          summary: '최소 정보 생성',
          value: {
            userId: 3,
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: '관리자 생성 완료',
      type: Manager,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.CONFLICT),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Managers with Pagination
//? ---------------------------------------------------------------------- ?//

export const GetManagersPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👨‍💼 관리자 목록 조회 (페이지네이션)',
      description: `
**📝 기능 설명**
- 페이지네이션이 적용된 관리자 목록을 조회합니다
- User, Affiliation 정보를 함께 제공합니다

**🔄 필터링 및 정렬**
- 검색: name (관리자 이름)
- 정렬: id, name, phone
- 필터링: phone (정확일치, 다중선택, 유사검색)

**📚 사용 시나리오**
- 관리자 계정 관리 페이지
- 전화번호로 관리자 검색
      `,
    }),
    ApiPaginationQuery(MANAGER_CONFIG),
    ApiOkPaginatedResponse(Manager, MANAGER_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Active Managers
//? ---------------------------------------------------------------------- ?//

export const GetActiveManagersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 활성 관리자 전체 목록',
      description: `
**📝 기능 설명**
- 삭제되지 않은 모든 활성 관리자를 조회합니다
- 페이지네이션 없이 전체 목록 반환

**🔄 비즈니스 로직**
1. 소프트 삭제된 관리자 제외
2. ID 내림차순 정렬
3. User, Affiliation 정보 포함

**📚 사용 시나리오**
- 드롭다운 메뉴용 관리자 목록
- 권한 할당 시 관리자 선택
      `,
    }),
    ApiOkResponse({
      description: '활성 관리자 목록 조회 완료',
      type: [Manager],
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Manager by ID
//? ---------------------------------------------------------------------- ?//

export const GetManagerByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 관리자 상세 정보 조회',
      description: `
**📝 기능 설명**
- 특정 관리자의 상세 정보를 조회합니다
- 연결된 User, Affiliation 정보 포함

**🔄 조회 정보**
- 관리자 기본 정보 (이름, 전화번호, 메모 등)
- 연결된 User 계정 정보
- 소속 Affiliation 정보

**📚 사용 시나리오**
- 관리자 프로필 페이지
- 관리자 정보 수정 전 현재 정보 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 관리자의 ID',
      required: true,
      example: 1,
    }),
    ApiOkResponse({
      description: '관리자 상세 조회 완료',
      type: Manager,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Manager
//? ---------------------------------------------------------------------- ?//

export const UpdateManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 관리자 정보 수정',
      description: `
**📝 기능 설명**
- 관리자 정보를 부분적으로 수정합니다
- 제공된 필드만 업데이트됩니다

**🔄 수정 가능 필드**
- name, phone, schoolId, schoolName
- note, termsAgreedAt

**⚠️ 중요 제약사항**
- userId는 수정 불가 (계정 연결 변경 불가)
- phone 번호 중복 시 오류

**📚 예시 시나리오**
- 관리자 연락처 정보 변경
- 소속 학교 변경
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 관리자의 ID',
      required: true,
      example: 1,
    }),
    ApiBody({
      type: UpdateManagerDto,
      examples: {
        'name-update': {
          summary: '이름 수정',
          value: {
            name: '김수정',
          },
        },
        'contact-update': {
          summary: '연락처 정보 수정',
          value: {
            phone: '010-5555-6666',
            schoolName: '서울대학교 사범대학 부속 초등학교',
          },
        },
        'comprehensive-update': {
          summary: '종합 정보 수정',
          value: {
            name: '박종합',
            phone: '010-7777-8888',
            schoolId: 2,
            note: '부산 지역 총괄 관리자',
          },
        },
      },
    }),
    ApiExtraModels(Manager),
    ApiOkResponse({
      description: '관리자 수정 완료',
      type: Manager,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.CONFLICT,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Manager
//? ---------------------------------------------------------------------- ?//

export const DeleteManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 관리자 계정 삭제',
      description: `
**📝 기능 설명**
- 관리자 계정을 영구적으로 삭제합니다
- 하드 삭제로 데이터가 완전히 제거됩니다

**🔄 삭제 정책**
1. 연결된 User 계정은 CASCADE 삭제
2. 관리자가 수행한 기록들은 유지
3. 삭제 후 복구 불가능

**⚠️ 중요 제약사항**
- 되돌릴 수 없는 작업
- 신중하게 수행 필요

**📚 예시 시나리오**
- 관리자 계정 완전 제거
- 테스트 계정 정리
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 관리자의 ID',
      required: true,
      example: 1,
    }),
    ApiOkResponse({
      description: '관리자 삭제 완료',
      type: Manager,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
