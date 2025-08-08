import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateDepartureBulkDto } from '../dto/create-departure-bulk.dto';
import { CreateDepartureDto } from '../dto/create-departure.dto';
import { UpdateDepartureDto } from '../dto/update-departure.dto';
import { Departure } from '../entities/departure.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Departure
//? ---------------------------------------------------------------------- ?//

export const CreateDepartureDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🚌 하교 기록 생성',
      description: `
**📝 기능 설명**
- 학생의 하교 시간과 방법을 기록합니다
- 학부모가 확인할 수 있는 하교 알림 기능을 제공합니다
- 안전한 하교 관리를 위한 필수 기록입니다

**🔄 비즈니스 로직**
1. 학생 ID와 하교 정보 검증
2. 하교 시간 자동 기록 (현재 시간)
3. 하교 방법 및 특이사항 기록
4. 학부모 알림 발송 (선택사항)
5. 하교 기록 생성 및 반환

**⚠️ 중요 제약사항**
- studentId와 schooldayId는 필수 파라미터
- date는 YYYY-MM-DD 형식 필수
- departuredAt은 ISO 8601 형식 (선택사항)
- 유효한 학생과 수업일만 사용 가능

**📚 예시 시나리오**
- 정규 하교 시간 기록
- 조기 하교 처리
- 특별 하교 방법 기록 (학부모 픽업, 버스 등)
      `,
    }),
    ApiBody({
      type: CreateDepartureDto,
      description: '하교 기록 생성에 필요한 정보',
      examples: {
        정규하교: {
          summary: '정규 하교 시간 기록',
          description: '일반적인 하교 시간에 기록하는 경우',
          value: {
            studentId: 1,
            schooldayId: 15,
            date: '2025-01-15',
            note: '정상 하교',
            departuredAt: '2025-01-15T15:30:00.000Z',
          },
        },
        조기하교: {
          summary: '조기 하교 기록',
          description: '수업 중간에 조기 하교하는 경우',
          value: {
            studentId: 2,
            schooldayId: 15,
            date: '2025-01-15',
            note: '병원 진료로 인한 조기 하교',
            departuredAt: '2025-01-15T13:45:00.000Z',
          },
        },
        학부모픽업: {
          summary: '학부모 픽업 하교',
          description: '학부모가 직접 픽업하는 경우',
          value: {
            studentId: 3,
            schooldayId: 15,
            date: '2025-01-15',
            note: '어머니 직접 픽업',
            departuredAt: '2025-01-15T15:25:00.000Z',
          },
        },
        자동시간: {
          summary: '하교 시간 자동 기록',
          description: 'departuredAt을 생략하면 현재 시간으로 자동 설정',
          value: {
            studentId: 4,
            schooldayId: 15,
            date: '2025-01-15',
            note: '정상 하교',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '하교 기록 생성 완료',
      type: Departure,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Departure Bulk
//? ---------------------------------------------------------------------- ?//

export const CreateDepartureBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🚌 Bulk Create Departure Records',
      description: `
**📝 Function Description**
- Creates departure records for multiple students simultaneously
- Sends departure notifications to each student's parents
- Efficient method for processing bulk departures

**🔄 Business Logic**
1. Validate student ID list
2. Retrieve parent information for each student
3. Create departure records in bulk
4. Send individual departure notifications to each parent
5. Return created departure records list

**⚠️ Important Constraints**
- studentIds array is required parameter
- All students must be from the same school
- Non-existent student IDs will return error
- Duplicate departure records cannot be created

**📚 Example Scenarios**
- Process all students' departure after class ends
- Bulk departure records for specific class students
- Process departure for students after events
      `,
    }),
    ApiBody({
      type: CreateDepartureBulkDto,
      description: 'Information required for bulk departure record creation',
      examples: {
        allStudents: {
          summary: 'All Students Departure Processing',
          description: 'Recording departure for all students after class ends',
          value: {
            studentIds: [1, 2, 3, 4, 5],
            schooldayId: 15,
            date: '2025-01-15',
            note: 'Normal departure',
          },
        },
        classStudents: {
          summary: 'Specific Class Students Departure',
          description: 'Processing departure for specific class students only',
          value: {
            studentIds: [10, 11, 12],
            schooldayId: 16,
            date: '2025-01-15',
            note: 'Grade 3 Class 1 departure',
          },
        },
        eventStudents: {
          summary: 'Event Participants Departure',
          description:
            'Processing departure for students who participated in special events',
          value: {
            studentIds: [20, 21, 22, 23],
            schooldayId: 17,
            date: '2025-01-15',
            note: 'Sports day participants departure',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: 'Bulk departure records created successfully',
      type: Departure,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find All Departures
//? ---------------------------------------------------------------------- ?//

export const FindAllDeparturesDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📋 전체 하교 기록 조회',
      description: `
**📝 기능 설명**
- 시스템에 등록된 모든 하교 기록을 조회합니다
- 관리자가 전체 하교 현황을 파악할 때 사용합니다
- 날짜별, 학생별 정렬을 지원합니다

**🔄 비즈니스 로직**
1. 모든 하교 기록 데이터 조회
2. 학생 정보와 함께 join
3. 최신 하교 기록 순으로 정렬
4. 삭제되지 않은 기록만 반환
5. 하교 방법별 통계 포함

**⚠️ 중요 제약사항**
- 관리자 권한 필요
- 대용량 데이터 처리 시 성능 고려
- 개인정보 보호 정책 준수
- 삭제된 기록은 제외

**📚 예시 시나리오**
- 일일 하교 현황 확인
- 하교 방법별 통계 분석
- 전체 하교 패턴 모니터링
      `,
    }),
    ApiOkResponseTemplate({
      description: '전체 하교 기록 조회 성공',
      type: Departure,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.FORBIDDEN),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Departure By Student
//? ---------------------------------------------------------------------- ?//

export const FindDepartureByStudentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👨‍🎓 학생별 하교 기록 조회',
      description: `
**📝 기능 설명**
- 특정 학생의 모든 하교 기록을 조회합니다
- 학부모가 자녀의 하교 이력을 확인할 때 사용합니다
- 시간순으로 정렬하여 패턴 분석이 가능합니다

**🔄 비즈니스 로직**
1. studentId로 해당 학생 확인
2. 학생의 모든 하교 기록 조회
3. 날짜 내림차순으로 정렬
4. 하교 방법별 분류
5. 특이사항 포함하여 반환

**⚠️ 중요 제약사항**
- studentId는 필수 파라미터
- 존재하지 않는 학생 ID는 빈 배열 반환
- 학부모는 본인 자녀 기록만 조회 가능
- 삭제된 기록은 제외

**📚 예시 시나리오**
- 학부모의 자녀 하교 이력 확인
- 학생별 하교 패턴 분석
- 하교 방법 변경 이력 추적
      `,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '학생별 하교 기록 조회 성공',
      type: Departure,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Departure By Date
//? ---------------------------------------------------------------------- ?//

export const FindDepartureByDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 날짜별 하교 기록 조회',
      description: `
**📝 기능 설명**
- 특정 날짜의 모든 하교 기록을 조회합니다
- 일일 하교 현황 관리에 사용합니다
- 날짜별 하교 통계를 제공합니다

**🔄 비즈니스 로직**
1. 날짜 형식 검증 (YYYY-MM-DD)
2. 해당 날짜의 모든 하교 기록 조회
3. 학생 정보와 함께 join
4. 하교 시간 순으로 정렬
5. 하교 방법별 집계 포함

**⚠️ 중요 제약사항**
- date는 YYYY-MM-DD 형식 필수
- 유효하지 않은 날짜 형식은 에러 반환
- 미래 날짜는 빈 배열 반환
- 최대 조회 가능 날짜 제한

**📚 예시 시나리오**
- 특정일 하교 현황 확인
- 날짜별 하교 통계 생성
- 하교 패턴 분석을 위한 데이터 수집
      `,
    }),
    ApiQuery({
      name: 'date',
      type: String,
      description: '조회할 날짜 (YYYY-MM-DD 형식)',
      example: '2024-03-15',
    }),
    ApiOkResponseTemplate({
      description: '날짜별 하교 기록 조회 성공',
      type: Departure,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find One Departure
//? ---------------------------------------------------------------------- ?//

export const FindOneDepartureDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 하교 기록 상세 조회',
      description: `
**📝 기능 설명**
- 특정 하교 기록의 상세 정보를 조회합니다
- 하교 기록 수정이나 확인 시 사용합니다
- 관련 학생 정보도 함께 제공합니다

**🔄 비즈니스 로직**
1. departureId로 특정 하교 기록 조회
2. 학생 정보와 함께 join
3. 하교 방법 상세 정보 포함
4. 특이사항 및 메모 포함
5. 완전한 하교 기록 정보 반환

**⚠️ 중요 제약사항**
- departureId는 필수 파라미터
- 존재하지 않는 ID는 404 에러 반환
- 삭제된 기록은 조회 불가
- 권한에 따른 접근 제어

**📚 예시 시나리오**
- 특정 하교 기록 상세 확인
- 하교 기록 수정 전 현재 정보 조회
- 하교 관련 문의 처리
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '하교 기록 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '하교 기록 상세 조회 성공',
      type: Departure,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Departure
//? ---------------------------------------------------------------------- ?//

export const UpdateDepartureDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 하교 기록 수정',
      description: `
**📝 기능 설명**
- 기존 하교 기록의 정보를 수정합니다
- 하교 방법이나 특이사항 변경 시 사용합니다
- 수정 이력을 추적하여 투명성을 보장합니다

**🔄 비즈니스 로직**
1. departureId로 기존 기록 확인
2. 수정 권한 검증
3. 변경 가능한 필드만 업데이트
4. 수정 이력 기록
5. 업데이트된 하교 기록 반환

**⚠️ 중요 제약사항**
- departureId는 필수 파라미터
- 존재하지 않는 기록은 수정 불가
- 일부 필드는 수정 제한 (예: 학생 ID)
- 수정 권한 확인 필요

**📚 예시 시나리오**
- 하교 방법 정보 수정
- 특이사항 추가 또는 수정
- 잘못 입력된 정보 정정
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '하교 기록 ID',
      example: 1,
    }),
    ApiBody({
      type: UpdateDepartureDto,
      description: '수정할 하교 기록 정보 (모든 필드 선택사항)',
      examples: {
        메모수정: {
          summary: '하교 메모만 수정',
          description: '기존 하교 기록의 메모만 변경하는 경우',
          value: {
            note: '학부모 픽업으로 변경됨',
          },
        },
        시간수정: {
          summary: '하교 시간 수정',
          description: '잘못 기록된 하교 시간을 수정하는 경우',
          value: {
            departuredAt: '2025-01-15T15:45:00.000Z',
            note: '하교 시간 정정',
          },
        },
        수업변경: {
          summary: '마지막 참석 수업 변경',
          description: '실제 마지막 참석한 수업이 달랐던 경우',
          value: {
            schooldayId: 16,
            note: '실제로는 6교시까지 참석',
          },
        },
        전체수정: {
          summary: '전체 정보 수정',
          description: '여러 필드를 한번에 수정하는 경우',
          value: {
            schooldayId: 14,
            note: '조기 하교 - 개인 사정',
            departuredAt: '2025-01-15T14:30:00.000Z',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '하교 기록 수정 완료',
      type: Departure,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Departure
//? ---------------------------------------------------------------------- ?//

export const DeleteDepartureDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 하교 기록 삭제',
      description: `
**📝 기능 설명**
- 특정 하교 기록을 삭제합니다
- 소프트 삭제 방식으로 데이터 복구가 가능합니다
- 삭제 이력을 추적하여 투명성을 보장합니다

**🔄 비즈니스 로직**
1. departureId로 대상 기록 확인
2. 삭제 권한 검증
3. 소프트 삭제 처리 (deletedAt 설정)
4. 관련 알림 기능 비활성화
5. 삭제 완료 응답 반환

**⚠️ 중요 제약사항**
- departureId는 필수 파라미터
- 존재하지 않는 기록은 삭제 불가
- 이미 삭제된 기록은 중복 삭제 불가
- 관리자 권한 필요

**📚 예시 시나리오**
- 잘못 생성된 하교 기록 삭제
- 테스트 데이터 정리
- 개인정보 보호 요청에 따른 삭제
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '하교 기록 ID',
      example: 1,
    }),
    ApiResponse({
      status: 204,
      description: '하교 기록 삭제 완료',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.FORBIDDEN),
  );
};
