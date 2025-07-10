import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
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
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { EndContractDto, StartContractDto } from '../dto/create-contract.dto';
import { Contract } from '../entities/contract.entity';

const LIST_SAMS_CONFIG: PaginateConfig<Contract> = {
  relations: {
    sam: {
      school: true,
    },
  },
  sortableColumns: ['id'],
  searchableColumns: ['note'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    startedBy: [FilterOperator.EQ],
    endedBy: [FilterOperator.EQ],
  },
};

const LIST_GROUPS_CONFIG: PaginateConfig<Contract> = {
  relations: {
    group: {
      lesson: true,
    },
  },
  sortableColumns: ['id'],
  searchableColumns: ['note'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    startedBy: [FilterOperator.EQ],
    endedBy: [FilterOperator.EQ],
  },
};

// StartContract
export const StartContractDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🎯 담임 계약 시작',
      description: `
**📝 기능 설명**
- 선생님을 특정 반에 담임으로 배정합니다
- 중간에 새로 합류하는 담임선생님 등록을 지원합니다
- 계약 시작 사유를 기록할 수 있습니다

**🔄 비즈니스 로직**
1. samId와 groupId로 선생님-반 관계 생성
2. 계약 시작일과 시작 사유 기록
3. 계약 시작자 정보 저장 (MANAGER 또는 OTHER)
4. 활성 상태의 계약으로 생성
5. 생성된 계약 정보 반환

**⚠️ 중요 제약사항**
- samId와 groupId는 필수 파라미터
- 중복 계약 생성 불가 (동일 선생님-반)
- 계약 시작일은 현재 시간으로 자동 설정
- startedBy는 현재 사용자 역할에 따라 결정

**📚 예시 시나리오**
- 신규 담임선생님 반 배정
- 기존 선생님의 추가 반 담당
- 중간 학기 담임 교체 시 사용
      `,
    }),
    ApiBody({ type: StartContractDto }),
    ApiCreatedResponseTemplate({
      description: '담임 계약 시작 완료',
      type: Contract,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

// EndContract
export const EndContractDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏁 담임 계약 종료',
      description: `
**📝 기능 설명**
- 특정 선생님의 반 담임 계약을 종료합니다
- 계약 종료 날짜와 사유를 기록합니다
- 마지막 수업일을 설정할 수 있습니다

**🔄 비즈니스 로직**
1. contractId로 기존 계약 조회
2. 계약 종료일과 종료 사유 기록
3. 계약 종료자 정보 저장 (MANAGER 또는 OTHER)
4. 계약 상태를 종료로 변경
5. 업데이트된 계약 정보 반환

**⚠️ 중요 제약사항**
- contractId는 필수 파라미터
- 이미 종료된 계약은 다시 종료 불가
- 계약 종료일은 현재 시간으로 자동 설정
- endedBy는 현재 사용자 역할에 따라 결정

**📚 예시 시나리오**
- 담임선생님 퇴사 시 계약 종료
- 반 담당 변경 시 기존 계약 종료
- 학기 중 담임 교체 처리
      `,
    }),
    ApiBody({ type: EndContractDto }),
    ApiOkResponseTemplate({
      description: '담임 계약 종료 완료',
      type: Contract,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// ListSams - 특정 수업의 담임선생님 목록 조회
export const ListSamsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👨‍🏫 수업별 담임선생님 목록 조회',
      description: `
**📝 기능 설명**
- 특정 수업에 배정된 모든 담임선생님 목록을 조회합니다
- 활성 및 비활성 계약을 모두 포함합니다
- 선생님의 학교 정보도 함께 제공합니다

**🔄 비즈니스 로직**
1. lessonId로 해당 수업 확인
2. 수업과 연결된 모든 담임 계약 조회
3. 선생님 정보와 학교 정보 join
4. ID 내림차순으로 정렬하여 반환
5. 계약 시작/종료 정보 포함

**⚠️ 중요 제약사항**
- lessonId는 필수 파라미터
- 존재하지 않는 수업 ID는 빈 배열 반환
- 삭제된 계약은 제외
- 선생님과 학교 정보 자동 포함

**📚 예시 시나리오**
- 특정 수업의 담임 현황 확인
- 수업별 선생님 배정 이력 조회
- 담임 변경 이력 추적
      `,
    }),
    ApiOkResponseTemplate({
      description: '수업의 담임선생님 목록 조회 성공',
      type: Contract,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// PaginatedListSams - 특정 수업의 담임선생님 목록 페이지네이션 조회
export const PaginatedListSamsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👨‍🏫📄 수업별 담임선생님 페이지네이션 조회',
      description: `
**📝 기능 설명**
- 특정 수업의 담임선생님 목록을 페이지네이션으로 조회합니다
- 검색 및 필터링 기능을 제공합니다
- 대용량 데이터 처리에 최적화되어 있습니다

**🔄 비즈니스 로직**
1. lessonId로 해당 수업의 계약들 조회
2. note 필드에서 키워드 검색 지원
3. startedBy, endedBy로 계약 주체 필터링
4. ID 내림차순 정렬로 최신 계약 우선
5. 페이지네이션 처리하여 반환

**⚠️ 중요 제약사항**
- lessonId는 필수 파라미터
- page, limit 등 페이지네이션 파라미터 지원
- search는 note 필드에서만 검색
- filter.startedBy로 계약 시작자 필터링 가능

**📚 예시 시나리오**
- 수업별 담임 이력 페이지 표시
- 특정 계약 사유 검색
- 관리자별 계약 생성 이력 조회
      `,
    }),
    ApiPaginationQuery(LIST_SAMS_CONFIG),
    ApiOkPaginatedResponse(Contract, LIST_SAMS_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// ListGroups - 특정 담임선생님의 반 목록 조회
export const ListGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫 선생님별 담당반 목록 조회',
      description: `
**📝 기능 설명**
- 특정 선생님이 담당하는 모든 반의 목록을 조회합니다
- 현재 담당 중인 반과 과거 담당했던 반을 모두 포함합니다
- 반의 수업 정보도 함께 제공합니다

**🔄 비즈니스 로직**
1. samId로 해당 선생님 확인
2. 선생님과 연결된 모든 담임 계약 조회
3. 반 정보와 수업 정보 join
4. ID 내림차순으로 정렬하여 반환
5. 계약 시작/종료 정보 포함

**⚠️ 중요 제약사항**
- samId는 필수 파라미터
- 존재하지 않는 선생님 ID는 빈 배열 반환
- 삭제된 계약은 제외
- 반과 수업 정보 자동 포함

**📚 예시 시나리오**
- 선생님의 담당반 현황 확인
- 과거 담당 이력 조회
- 선생님별 업무량 파악
      `,
    }),
    ApiOkResponseTemplate({
      description: '담임선생님의 반 목록 조회 성공',
      type: Contract,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// PaginatedListGroups - 특정 담임선생님의 반 목록 페이지네이션 조회
export const PaginatedListGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫📄 선생님별 담당반 페이지네이션 조회',
      description: `
**📝 기능 설명**
- 특정 선생님의 담당반 목록을 페이지네이션으로 조회합니다
- 계약 사유 검색 및 필터링을 지원합니다
- 대용량 데이터 효율적 처리가 가능합니다

**🔄 비즈니스 로직**
1. samId로 해당 선생님의 계약들 조회
2. note 필드에서 키워드 검색 지원
3. startedBy, endedBy로 계약 주체 필터링
4. ID 내림차순 정렬로 최신 계약 우선
5. 페이지네이션 처리하여 반환

**⚠️ 중요 제약사항**
- samId는 필수 파라미터
- page, limit 등 페이지네이션 파라미터 지원
- search는 note 필드에서만 검색
- filter.endedBy로 계약 종료자 필터링 가능

**📚 예시 시나리오**
- 선생님 담당반 이력 페이지 표시
- 특정 배정 사유 검색
- 계약 변경 이력 추적
      `,
    }),
    ApiPaginationQuery(LIST_GROUPS_CONFIG),
    ApiOkPaginatedResponse(Contract, LIST_GROUPS_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// UpdateContract
export const UpdateContractDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✏️ 담임 계약 정보 수정',
      description: `
**📝 기능 설명**
- 기존 담임 계약의 특정 정보를 수정합니다
- 계약 사유나 기타 메모 정보를 업데이트할 수 있습니다
- 계약 관계는 유지하면서 세부 정보만 변경합니다

**🔄 비즈니스 로직**
1. contractId로 기존 계약 조회
2. 제공된 DTO로 계약 정보 업데이트
3. 수정 가능한 필드만 선별적 업데이트
4. 계약 관계 정보는 유지
5. 업데이트된 계약 정보 반환

**⚠️ 중요 제약사항**
- contractId는 필수 파라미터
- 존재하지 않는 계약 ID는 에러 반환
- 삭제된 계약은 수정 불가
- 일부 필드만 선별적 수정 가능

**📚 예시 시나리오**
- 계약 사유 정보 수정
- 추가 메모 정보 업데이트
- 계약 세부사항 보완
      `,
    }),
    ApiBody({ type: UpdateGroupDto }),
    ApiOkResponseTemplate({
      description: '담임 계약 정보 수정 완료',
      type: Contract,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// DeleteContract
export const DeleteContractDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ 담임 계약 삭제',
      description: `
**📝 기능 설명**
- 특정 담임 계약을 완전히 삭제합니다
- 소프트 삭제 방식으로 데이터 복구가 가능합니다
- 계약 이력 추적을 위해 완전 삭제하지 않습니다

**🔄 비즈니스 로직**
1. contractId로 대상 계약 확인
2. 계약이 활성 상태인지 검증
3. 소프트 삭제 처리 (deletedAt 설정)
4. 관련 데이터 정합성 유지
5. 삭제된 계약 정보 반환

**⚠️ 중요 제약사항**
- contractId는 필수 파라미터
- 존재하지 않는 계약 ID는 에러 반환
- 이미 삭제된 계약은 중복 삭제 불가
- 완전 삭제가 아닌 소프트 삭제

**📚 예시 시나리오**
- 잘못 생성된 계약 삭제
- 취소된 담임 배정 제거
- 데이터 정리 작업
      `,
    }),
    ApiOkResponse({ description: '담임 계약 삭제 완료' }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
