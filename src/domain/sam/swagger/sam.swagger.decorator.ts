import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { BulkUpdateSamsDto } from '../dto/bulk-update-sams.dto';
import { CreateSamDto } from '../dto/create-sam.dto';
import { UpdateSamDto } from '../dto/update-sam.dto';

//? ---------------------------------------------------------------------- ?//
//? Create
//? ---------------------------------------------------------------------- ?//

export const CreateSamDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📝 담임쌤(Sam) 생성',
      description: `
### 📋 기능 설명
새로운 담임쌤을 시스템에 등록합니다.

### 🏷️ 두 가지 생성 방식
**1. 🆕 미등록 강사와 함께 생성** (추천)
- \`instructor.id\` 제외, \`instructor.phone\` 필수
- 새로운 강사를 생성하면서 담임쌤 등록

**2. 🔗 기존 강사와 연결하여 생성**
- \`instructor.id\`만 제공 (instructor 필드들은 무시됨)
- 이미 등록된 강사와 담임쌤 연결

### 📌 비즈니스 규칙
- **필수 정보**: schoolId, alias, instructor
- **강사 정보**: instructor 객체는 항상 필수
- **선택 정보**: score, editFeePermission, editPickPermission, note
- **중복 체크**: 동일 학교 내 강사 전화번호 중복 불가
- **점수 범위**: 0~100점만 가능

### ⚠️ 주의사항
- instructor 객체는 항상 필수 (일관성 있는 API 구조)
- 기존 강사 연결: instructor.id만 제공
- 새로운 강사 생성: instructor.id 제외, instructor.phone 필수
- 전화번호는 하이픈 없이 숫자만 입력
- 별칭은 한글, 영문, 숫자, 공백만 허용
      `,
    }),
    ApiBody({
      type: CreateSamDto,
      examples: {
        'direct-instructor-reference': {
          summary: '🎯 강사 ID로 직접 연결',
          description:
            '기존 강사의 ID를 사용하여 직접 연결하는 방식 (가장 간단한 방법)',
          value: {
            schoolId: 1,
            alias: '홍선생',
            score: 85,
            editFeePermission: true,
            editPickPermission: false,
            note: '수학 전문 강사, 학생들과 소통이 원활함',
            instructorId: 1,
          },
        },
        'existing-instructor': {
          summary: '🔗 기존 강사와 연결하여 담임쌤 생성',
          description:
            '이미 등록된 강사와 연결하여 담임쌤을 등록하는 경우 (instructor.id만 포함)',
          value: {
            schoolId: 1,
            alias: '홍선생',
            score: 85,
            editFeePermission: true,
            editPickPermission: false,
            note: '수학 전문 강사, 학생들과 소통이 원활함',
            instructor: {
              id: 1,
            },
          },
        },
        'new-instructor': {
          summary: '🆕 미등록 강사와 함께 담임쌤 생성',
          description:
            '새로운 강사를 생성하면서 담임쌤을 등록하는 경우 (instructor 객체 포함, instructorId 제외)',
          value: {
            schoolId: 1,
            alias: '홍선생',
            score: 85,
            editFeePermission: true,
            editPickPermission: false,
            note: '수학 전문 강사, 학생들과 소통이 원활함',
            instructor: {
              name: '홍길동',
              phone: '01012345678',
              note: '10년 경력의 베테랑 강사',
            },
          },
        },
        'detailed-new-instructor': {
          summary: '📝 상세 정보와 함께 새로운 강사 및 담임쌤 생성',
          description: '새로운 강사의 상세 정보와 함께 담임쌤을 등록하는 경우',
          value: {
            schoolId: 1,
            alias: '김수학쌤',
            score: 95,
            editFeePermission: true,
            editPickPermission: true,
            note: '초등 수학 전문, 체험학습 프로그램 운영 가능',
            instructor: {
              name: '김수학',
              phone: '01087654321',
              note: '서울대 수학교육과 졸업, 교원자격증 보유',
              termsAgreedAt: '2025-01-01T12:00:00Z',
            },
          },
        },
        'minimal-new-instructor': {
          summary: '⭐ 최소 정보로 새로운 강사 및 담임쌤 생성',
          description: '필수 정보만으로 새로운 강사와 담임쌤을 등록하는 경우',
          value: {
            schoolId: 1,
            alias: '이선생',
            instructor: {
              phone: '01011112222',
            },
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '✅ 담임쌤 생성 성공',
      type: Sam,
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description:
        '🚫 요청 데이터 오류 - 필수 필드 누락, 데이터 형식 오류, 강사 전화번호 중복',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 리소스 없음 - 존재하지 않는 학교 ID 또는 강사 ID',
    }),
    ApiResponse({
      status: StatusCodes.CONFLICT,
      description: '⚠️ 데이터 충돌 - 동일 학교 내 강사 중복',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? School Sam (dryrun)
//? ---------------------------------------------------------------------- ?//

export const SamDryRunDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔍 담임쌤 생성 사전 검증',
      description: `
### 📋 기능 설명
담임쌤 생성 전 중복 여부를 사전 검증합니다.

### 🏷️ 검증 방식
실제 생성 API와 동일한 payload 구조를 사용:
- **새로운 강사**: instructor.id 제외, instructor.phone 필수
- **기존 강사**: instructor.id만 제공

### 🎯 검증 항목
- 동일 학교 내 강사 전화번호 중복
- 동일 학교 내 강사명 중복
- 담임쌤 별칭 중복

### 📤 응답
- **중복 없음**: null 반환
- **중복 있음**: 중복되는 담임쌤 정보 반환

### 💡 사용 시점
- 담임쌤 등록 폼에서 실시간 검증
- 대량 등록 전 사전 체크
- UI에서 중복 경고 표시
      `,
    }),
    ApiBody({
      type: CreateSamDto,
      examples: {
        'dryrun-instructor-id': {
          summary: '🎯 강사 ID로 직접 연결 검증',
          description: '기존 강사 ID를 사용한 직접 연결 방식으로 검증',
          value: {
            schoolId: 1,
            alias: '홍선생',
            instructorId: 1,
          },
        },
        'dryrun-existing-instructor': {
          summary: '🔗 기존 강사 연결 방식으로 검증',
          description: '기존 강사 연결 방식으로 검증',
          value: {
            schoolId: 1,
            alias: '홍선생',
            instructor: {
              id: 1,
            },
          },
        },
        'dryrun-new-instructor': {
          summary: '🆕 미등록 강사와 함께 생성 검증',
          description: '새로운 강사 생성 방식으로 검증',
          value: {
            schoolId: 1,
            alias: '홍선생',
            instructor: {
              phone: '01012345678',
            },
          },
        },
        'dryrun-detailed': {
          summary: '📋 상세 정보 포함 검증',
          description: '상세 정보를 포함한 새로운 강사 방식으로 검증',
          value: {
            schoolId: 1,
            alias: '김수학쌤',
            score: 95,
            editFeePermission: true,
            editPickPermission: true,
            instructor: {
              name: '김수학',
              phone: '01087654321',
              note: '서울대 수학교육과 졸업',
            },
          },
        },
      },
    }),
    ApiOkResponse({
      description: '✅ 검증 완료',
      schema: {
        oneOf: [
          { type: 'null', description: '중복 없음 - 생성 가능' },
          {
            $ref: '#/components/schemas/Sam',
            description: '중복 담임쌤 정보',
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Get Sam by ID
//? ---------------------------------------------------------------------- ?//

export const GetSamByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학교에 속한 강사 상세 조회',
      description: `
      - 학교에 속한 특정 강사의 상세 정보를 조회한다.
      - 학교에 속한 강사의 상세 정보를 조회한다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '강사 ID',
    }),
    ApiExtraModels(Sam, Instructor, Contract),
    ApiOkResponse({
      description: '학교에 속한 강사 상세 조회',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Sam) },
          {
            type: 'object',
            properties: {
              instructor: {
                $ref: getSchemaPath(Instructor),
              },
              contracts: {
                type: 'array',
                items: { $ref: getSchemaPath(Contract) },
              },
            },
          },
        ],
      },
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Get Sam Groups
//? ---------------------------------------------------------------------- ?//

export const GetSamGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📚 강의중인 반 조회',
      description: `
### 📋 기능 설명
담임쌤이 현재 강의중인 반 목록을 조회합니다.

### 🏷️ 조회 조건
- **기본**: 담임쌤이 담당하는 모든 반 조회
- **학기 필터**: termId 전달 시 해당 학기의 반만 필터링
- **활성 반**: 현재 강의중인 반만 조회
- **정렬**: sortBy 파라미터로 요일별 또는 이름별 정렬 가능

### 📌 비즈니스 규칙
- 담임쌤이 담당하는 반만 조회됩니다
- 학기별로 필터링 가능합니다
- 요일별 정렬 시 월요일부터 토요일까지 순서로 정렬됩니다
- 이름별 정렬 시 한글 가나다순으로 정렬됩니다
- 반 정보와 함께 수업 정보도 포함됩니다

### 💡 사용 시점
- 담임쌤 대시보드에서 현재 담당 반 확인
- 학기별 반 관리
- 수업 일정 확인
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (선택사항, 전달 시 해당 학기의 반만 필터링)',
      required: false,
    }),
    ApiQuery({
      name: 'sortBy',
      type: String,
      description:
        '정렬 기준 (선택사항, "weekday": 요일별 정렬, "name": 이름별 정렬)',
      required: false,
      enum: ['weekday', 'name'],
    }),
    ApiExtraModels(Group, Lesson),
    ApiOkResponse({
      description: '✅ 강의중인 반 목록 조회 성공',
      schema: {
        type: 'array',
        items: {
          allOf: [
            { $ref: getSchemaPath(Group) },
            {
              type: 'object',
              properties: {
                lesson: {
                  $ref: getSchemaPath(Lesson),
                },
              },
            },
          ],
        },
      },
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 리소스 없음 - 존재하지 않는 담임쌤 ID',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Get Sam All Schooldays
//? ---------------------------------------------------------------------- ?//

export const GetAllSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 담임쌤의 모든 수업일 조회',
      description: `
### 📋 기능 설명
담임쌤이 담당하는 모든 수업일을 조회합니다.

### 🏷️ 조회 조건
- **기본**: 모든 수업일 조회
- **학기 필터**: termId 전달 시 해당 학기의 수업만 필터링
- **월별 필터**: date 파라미터로 특정 월의 수업만 필터링 (YYYY-MM 형식)

### 📌 비즈니스 규칙
- 담임쌤이 직접 담당하는 그룹의 수업만 조회됩니다
- 학기별로 필터링 가능합니다
- 월별로 필터링 가능합니다 (해당 월의 시작일부터 마지막일까지)
- 수업 정보와 함께 반 정보도 포함됩니다
- SQL 레벨에서 최적화된 조회로 성능 향상

### 💡 사용 시점
- 담임쌤 대시보드에서 전체 수업 일정 확인
- 학기별 수업 관리
- 월별 수업 일정 확인
- 수업 준비 및 계획
- 전체 수업 일정 분석
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (선택사항, 전달 시 해당 학기의 수업만 필터링)',
      required: false,
    }),
    ApiQuery({
      name: 'date',
      type: String,
      description:
        '조회할 월 (YYYY-MM 형식, 선택사항, 전달 시 해당 월의 수업만 필터링)',
      required: false,
      example: '2025-08',
    }),
    ApiExtraModels(Schoolday),
    ApiOkResponse({
      description: '✅ 모든 수업일 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Schoolday) },
      },
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 리소스 없음 - 존재하지 않는 담임쌤 ID',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Get Sam Schooldays By Date
//? ---------------------------------------------------------------------- ?//

export const GetSchooldaysByDateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 특정 날짜의 수업일 조회',
      description: `
### 📋 기능 설명
담임쌤이 담당하는 특정 날짜의 수업일을 조회합니다.

### 🏷️ 조회 조건
- **필수**: date 파라미터로 특정 날짜 지정
- **정확한 날짜**: YYYY-MM-DD 형식으로 정확한 날짜 입력

### 📌 비즈니스 규칙
- 담임쌤이 직접 담당하는 그룹의 수업만 조회됩니다
- 지정된 날짜의 수업만 정확히 조회됩니다
- 수업 정보와 함께 반 정보도 포함됩니다
- SQL 레벨에서 최적화된 조회로 성능 향상

### 💡 사용 시점
- 특정 날짜의 수업 일정 확인
- 일일 수업 준비
- 출석 관리
- 수업 일정 검증
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '담임쌤 ID',
    }),
    ApiParam({
      name: 'date',
      type: String,
      description: '조회할 날짜 (YYYY-MM-DD 형식)',
      example: '2025-01-15',
    }),
    ApiExtraModels(Schoolday),
    ApiOkResponse({
      description: '✅ 특정 날짜 수업일 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Schoolday) },
      },
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 리소스 없음 - 존재하지 않는 담임쌤 ID',
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description: '🚫 요청 데이터 오류 - 잘못된 날짜 형식',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Update Sam
//? ---------------------------------------------------------------------- ?//

export const UpdateSamDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학교에 속한 강사 정보 수정',
      description: `
      - 학교에 속한 강사의 정보를 수정한다.
      - alias, score, editFeePermission, editPickPermission, note 등의 정보를 수정할 수 있다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교에 속한 강사 ID',
    }),
    ApiBody({
      type: UpdateSamDto,
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사 정보 수정 완료',
      type: Sam,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Bulk Update Sams
//? ---------------------------------------------------------------------- ?//

export const BulkUpdateSamsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📝 담임쌤(Sam) 일괄 수정',
      description: `
### 📋 기능 설명
여러 담임쌤의 정보를 한 번에 일괄 수정합니다.

### 🏷️ 수정 가능한 필드
- **score**: 평가 점수 (0~100점)
- **editFeePermission**: 수업료 편집 권한
- **editPickPermission**: 픽업 편집 권한

### 📌 비즈니스 규칙
- **두 가지 방식**: 
  1. **직접 지정**: samIds 배열로 수정할 담임쌤 ID 목록 제공
  2. **학기별 일괄**: termId 쿼리 파라미터로 해당 학기의 모든 담임쌤 자동 선택
- **트랜잭션**: 모든 수정이 성공하거나 모두 실패 (원자성 보장)
- **존재 확인**: 모든 담임쌤 ID가 유효한지 사전 검증
- **강사 정보**: 강사 정보는 변경하지 않음 (개별 수정 권장)

### ⚠️ 주의사항
- termId 사용 시 samIds는 무시됩니다
- termId 미사용 시 samIds는 필수입니다
- 존재하지 않는 담임쌤 ID가 있으면 전체 작업이 실패합니다
- 강사 정보 변경이 필요한 경우 개별 수정 API를 사용하세요
- 모든 수정은 트랜잭션으로 처리되어 일관성을 보장합니다
      `,
    }),
    ApiBody({
      type: BulkUpdateSamsDto,
      examples: {
        'score-update': {
          summary: '🎯 평가 점수 일괄 수정',
          description: '여러 담임쌤의 평가 점수를 동일하게 수정',
          value: {
            samIds: [1, 2, 3, 4],
            score: 90,
          },
        },
        'permission-update': {
          summary: '🔐 권한 일괄 수정',
          description: '여러 담임쌤의 권한을 동일하게 수정',
          value: {
            samIds: [1, 2, 3],
            editFeePermission: true,
            editPickPermission: false,
          },
        },
        'comprehensive-update': {
          summary: '📋 종합 정보 일괄 수정',
          description: '담임쌤 정보를 종합적으로 일괄 수정',
          value: {
            samIds: [1, 2, 3],
            score: 95,
            editFeePermission: true,
            editPickPermission: true,
          },
        },
        'minimal-update': {
          summary: '⭐ 최소 정보 일괄 수정',
          description: '최소한의 정보만으로 일괄 수정',
          value: {
            samIds: [1, 2],
            score: 80,
          },
        },
        'term-based-update': {
          summary: '📚 학기별 일괄 수정',
          description:
            'termId 쿼리 파라미터와 함께 사용하여 해당 학기의 모든 담임쌤 수정',
          value: {
            score: 85,
            editFeePermission: true,
          },
        },
      },
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description:
        '학기 ID (선택사항, 전달 시 해당 학기의 모든 담임쌤을 자동으로 선택하여 수정)',
      required: false,
    }),
    ApiOkResponseTemplate({
      description: '✅ 담임쌤 일괄 수정 성공',
      type: Sam,
      isArray: true,
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description:
        '🚫 요청 데이터 오류 - 데이터 형식 오류, 유효하지 않은 점수 범위',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description:
        '🔍 리소스 없음 - 존재하지 않는 담임쌤 ID 또는 해당 학기에 담임쌤이 없음',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Soft Delete Sam
//? ---------------------------------------------------------------------- ?//

export const SoftDeleteSamDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학교에 속한 강사 소프트 삭제',
      description: `
      - 학교에 속한 강사의 정보를 소프트 삭제한다.
      - 실제로는 deletedAt 컬럼에 삭제 시각을 기록하여 논리적으로만 삭제한다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교에 속한 강사 ID',
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사 소프트 삭제 완료',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
