import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { UpdateSchooldayTimeDto } from '../dto/update-schoolday.dto';
import { Schoolday } from '../entities/schoolday.entity';

//? ---------------------------------------------------------------------- ?//
//? Get Schoolday List
//? ---------------------------------------------------------------------- ?//

export const GetSchooldayListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 수업일 목록 조회 (필터링)',
      description: `
**📝 기능 설명**
- 다양한 조건으로 수업일 목록을 조회합니다
- MySQL에서 직접 조회하여 실시간 데이터를 제공합니다
- 교무 관리 시스템의 핵심 기능 중 하나입니다

**🔍 필터 옵션**
- \`schoolId\`: 특정 학교의 수업일만 조회
- \`termId\`: 특정 학기의 수업일만 조회  
- \`groupId\`: 특정 그룹(반)의 수업일만 조회
- \`date\`: 특정 날짜의 수업일만 조회 (YYYY-MM-DD 형식)

**📊 응답 데이터**
- 수업일 기본 정보 (시작/종료 시간, 소요시간, 비고)
- 그룹 정보 (반 이름, 수업 정보)
- 학생 목록 (해당 반에 소속된 학생들)
- 강사 정보 (Sam과 Instructor 관계를 통한 강사명)

**🔍 활용 예시**
- 교무 관리자: 오늘의 전체 수업 일정 확인
- 강사: 자신이 담당하는 수업 일정 조회
- 학부모: 자녀의 수업 일정 확인
- 시스템 관리: 특정 기간 수업 통계 생성

**⚠️ 중요 제약사항**
- 필터 없이 전체 조회 시 대량 데이터 반환될 수 있음
- 날짜 필터 사용 시 YYYY-MM-DD 형식 준수 필요
- 삭제된 그룹의 수업일은 자동 제외됨
      `,
    }),
    ApiQuery({
      name: 'schoolId',
      type: Number,
      required: false,
      description: '🏫 학교 ID로 필터링',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      required: false,
      description: '📚 학기 ID로 필터링',
      example: 1,
    }),
    ApiQuery({
      name: 'groupId',
      type: Number,
      required: false,
      description: '👥 그룹(반) ID로 필터링',
      example: 10,
    }),
    ApiQuery({
      name: 'date',
      type: String,
      required: false,
      description: '📅 특정 날짜로 필터링 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponseTemplate({
      description: '수업일 목록 조회 성공',
      type: Schoolday,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.INTERNAL_SERVER_ERROR),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Today's Schooldays
//? ---------------------------------------------------------------------- ?//

export const GetTodaySchooldaysDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 오늘의 수업일 목록 조회',
      description: `
**📝 기능 설명**
- 오늘 날짜의 모든 수업일을 조회합니다
- 반 이름, 시간, 강사명, 장소, 인원수 정보가 모두 포함됩니다
- 실시간 수업 관리 및 출석 확인에 최적화된 엔드포인트입니다

**📊 응답 데이터**
- ✅ **반 이름**: group.groupName
- ✅ **수업 시간**: group.start, group.end  
- ✅ **강사명**: group.sam.instructor.name
- ✅ **수업 장소**: group.location
- ✅ **정원/인원수**: group.capacity
- ✅ **현재 수강생**: group.picks (학생 목록)

**🔍 활용 예시**
- 강사: 오늘 담당 수업 일정 및 학생 명단 확인
- 관리자: 오늘의 전체 수업 운영 현황 모니터링
- 학부모: 자녀의 오늘 수업 일정 및 담당 강사 확인

**⚠️ 중요 제약사항**
- 시스템 시간 기준으로 오늘 날짜 결정
- 휴일이나 특별 일정은 별도 확인 필요
- 임시 수업 변경 사항은 실시간 반영
      `,
    }),
    ApiQuery({
      name: 'schoolId',
      type: Number,
      required: false,
      description: '🏫 특정 학교의 오늘 수업만 조회',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      required: false,
      description: '📚 특정 학기의 오늘 수업만 조회',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '오늘의 수업일 목록 조회 성공',
      type: Schoolday,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.INTERNAL_SERVER_ERROR),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Schoolday Paginated List
//? ---------------------------------------------------------------------- ?//

export const GetSchooldayPaginatedListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅📄 수업일 페이지네이션 목록 조회',
      description: `
**📝 기능 설명**
- 대량의 수업일 데이터를 페이지네이션으로 효율적으로 조회합니다
- nestjs-paginate 라이브러리를 사용하여 고급 필터링과 정렬을 지원합니다
- 관리자 대시보드와 데이터 분석에 최적화된 엔드포인트입니다

**🔍 검색 & 필터링**
- \`search\`: name 필드에서 키워드 검색
- \`filter.schoolId\`: 학교별 필터링 (정확히 일치)
- \`filter.termId\`: 학기별 필터링 (정확히 일치)
- \`filter.groupId\`: 그룹별 필터링 (정확히 일치, 여러 값 포함)
- \`filter.startsAt\`: 시작 시간 범위 필터링 (이상, 이하, 정확히)
- \`sortBy\`: id, name, startsAt, endsAt 기준 정렬 (기본값: id DESC)

**📊 쿼리 파라미터 예시**
- \`?page=1&limit=20\`: 첫 페이지, 20개씩
- \`?search=수학&sortBy=startsAt:ASC\`: '수학' 키워드 검색, 시작시간 오름차순
- \`?filter.schoolId=1&filter.termId=2\`: 특정 학교와 학기의 수업일만
      `,
    }),
    ApiPaginationQuery({
      sortableColumns: ['id', 'name', 'startsAt', 'endsAt'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        schoolId: [FilterOperator.EQ],
        termId: [FilterOperator.EQ],
        lessonId: [FilterOperator.EQ],
        groupId: [FilterOperator.EQ, FilterOperator.IN],
        startsAt: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
        endsAt: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
      },
    }),
    ApiOkPaginatedResponse(Schoolday, {
      sortableColumns: ['id', 'name', 'startsAt', 'endsAt'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        schoolId: [FilterOperator.EQ],
        termId: [FilterOperator.EQ],
        lessonId: [FilterOperator.EQ],
        groupId: [FilterOperator.EQ, FilterOperator.IN],
        startsAt: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
        endsAt: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Schoolday by ID
//? ---------------------------------------------------------------------- ?//

export const GetSchooldayByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 수업일 상세 정보 조회',
      description: `
**📝 기능 설명**
- 특정 수업일의 상세 정보를 조회합니다
- 모든 관련 데이터 (그룹, 학생, 수업 정보)가 포함됩니다
- 권한별 접근 제어가 적용됩니다

**📊 응답 데이터**
- 수업일 전체 정보 (시간, 기간, 수정 이력)
- 그룹 정보 (반 이름, 장소, 정원)
- 학생 목록 (현재 수강생 전체)
- 수업 정보 (강좌명, 스케줄)

**🔍 활용 예시**
- 강사: 특정 수업의 학생 명단 및 상세 정보 확인
- 관리자: 수업 운영 현황 및 변경 이력 조회
- 시스템: 출석부 생성을 위한 기초 데이터

**⚠️ 중요 제약사항**
- 존재하지 않는 ID 조회 시 404 에러
- 삭제된 그룹의 수업일은 조회 불가
- 권한에 따라 일부 정보 제한될 수 있음
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 수업일 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '수업일 상세 정보 조회 성공',
      type: Schoolday,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Schoolday Time
//? ---------------------------------------------------------------------- ?//

export const UpdateSchooldayTimeDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 수업일 시간 수정',
      description: `
**📝 기능 설명**
- 특정 수업일의 시작/종료 시간을 수정합니다
- MySQL과 DynamoDB를 동시에 업데이트합니다
- 권한 체계 및 제약 조건이 적용됩니다

**🔄 비즈니스 로직**
- updatedBy는 현재 로그인한 사용자의 role로 자동 설정
- 동일한 시간으로 변경 시도 시 400 에러 반환
- 수업일 변경 시 다이나모 출석부도 자동 수정됨

**📚 수정 시나리오**
1. **긴급 시간 변경**: 강사 사정으로 수업 시간 조정
2. **시설 문제**: 교실 사용 불가로 인한 시간 이동
3. **학사 일정 변경**: 학교 행사로 인한 수업 시간 조정
4. **시스템 오류 수정**: 잘못 입력된 시간 정보 수정

**⚠️ 중요 제약사항**
- 입력값이 기존값과 동일하면 변경 불가
- 과거 날짜의 수업일은 수정 제한될 수 있음
- 출석부가 있는 수업일 변경 시 주의 필요
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 수업일 ID',
      example: 1,
    }),
    ApiBody({
      type: UpdateSchooldayTimeDto,
      description: '수업일 시간 수정 데이터',
    }),
    ApiOkResponseTemplate({
      description: '수업일 시간 수정 완료',
      type: Schoolday,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.FORBIDDEN,
    ),
  );
};
