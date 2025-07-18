import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Booking } from '../../booking/entities/booking.entity';
import { Student } from '../../student/entities/student.entity';
import { CreateOfferingDto } from '../dto/create-offering.dto';
import { UpdateOfferingDto } from '../dto/update-offering.dto';
import { Offering } from '../entities/offering.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Offering
//? ---------------------------------------------------------------------- ?//

export const CreateOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📚 수강신청과목 생성',
      description: `
**📝 기능 설명**
- 새로운 수강신청과목을 생성합니다
- 복잡한 수강신청 규칙과 시간표를 설정할 수 있습니다
- 이전 수강생 우선권 및 정원 관리를 지원합니다

**🔄 비즈니스 로직**
1. 학교와 학기 정보 검증
2. 수업 시간표 중복 검사
3. 허용 학년 및 정원 설정
4. 수강신청 규칙 적용 (선착순, 재수강우선, 무작위, 누구나)
5. 이전 수강생 ID 목록 설정
6. 비트마스크 기반 시간표 충돌 검사

**⚠️ 중요 제약사항**
- termId는 필수 파라미터
- schoolName, lessonName, groupName은 필수 문자열
- times 배열은 최소 1개 이상의 수업 시간 필요
- allowedGrades는 1-6 범위의 학년 배열
- pickRule은 유효한 PickRule enum 값이어야 함
- bitmasks와 groupIds 배열은 시간표 관리용

**📚 예시 시나리오**
- 선착순 수강신청 과목 생성
- 재수강생 우선권이 있는 과목 설정
- 무작위 추첨 방식 과목 등록
- 정원 제한 없는 자유 과목 생성
      `,
    }),
    ApiBody({
      type: CreateOfferingDto,
      description: '수강신청과목 생성에 필요한 상세 정보',
      examples: {
        선착순과목: {
          summary: '선착순 수강신청 과목',
          description: '일반적인 선착순 방식의 수강신청 과목',
          value: {
            termId: 1,
            schoolName: '서울초등학교',
            lessonName: '바이올린',
            groupName: 'A반',
            capacity: 20,
            prepicked: 5,
            allowedGrades: [3, 4, 5],
            pickRule: '선착순',
            times: [
              {
                weekday: '화요일',
                start: '15:00',
                end: '16:00',
              },
              {
                weekday: '목요일',
                start: '15:00',
                end: '16:00',
              },
            ],
            bitmasks: [1024, 2048],
            groupIds: [1, 2],
            prepickedStudentIds: [10, 11, 12, 13, 14],
            status: 'PENDING',
          },
        },
        재수강우선: {
          summary: '재수강생 우선 과목',
          description: '이전 수강생에게 우선권을 주는 과목',
          value: {
            termId: 1,
            schoolName: '서울초등학교',
            lessonName: '피아노',
            groupName: 'B반',
            capacity: 15,
            prepicked: 8,
            allowedGrades: [4, 5, 6],
            pickRule: '재수강우선',
            times: [
              {
                weekday: '월요일',
                start: '16:00',
                end: '17:00',
              },
            ],
            bitmasks: [512],
            groupIds: [3],
            prepickedStudentIds: [20, 21, 22, 23, 24, 25, 26, 27],
            status: 'PENDING',
          },
        },
        무작위추첨: {
          summary: '무작위 추첨 과목',
          description: '공정한 추첨을 통한 수강생 선발',
          value: {
            termId: 1,
            schoolName: '서울초등학교',
            lessonName: '미술',
            groupName: '창작반',
            capacity: 25,
            prepicked: 0,
            allowedGrades: [1, 2, 3, 4, 5, 6],
            pickRule: '무작위',
            times: [
              {
                weekday: '수요일',
                start: '14:00',
                end: '15:30',
              },
            ],
            bitmasks: [256],
            groupIds: [4],
            prepickedStudentIds: [],
            status: 'PENDING',
          },
        },
        누구나가능: {
          summary: '정원 제한 없는 자유 과목',
          description: '누구나 신청 가능한 자율 활동',
          value: {
            termId: 1,
            schoolName: '서울초등학교',
            lessonName: '독서토론',
            groupName: '자율반',
            capacity: 0,
            allowedGrades: [3, 4, 5, 6],
            pickRule: '누구나',
            times: [
              {
                weekday: '금요일',
                start: '15:30',
                end: '16:30',
              },
            ],
            bitmasks: [4096],
            groupIds: [5],
            prepickedStudentIds: [],
            status: 'PENDING',
          },
        },
        복합시간표: {
          summary: '복잡한 시간표 과목',
          description: '여러 요일에 걸친 수업 시간',
          value: {
            schoolId: 1,
            termId: 1,
            lessonId: 10,
            schoolName: '서울초등학교',
            lessonName: '축구',
            groupName: '축구부',
            capacity: 22,
            prepicked: 11,
            allowedGrades: [4, 5, 6],
            pickRule: '선착순',
            times: [
              {
                weekday: '화요일',
                start: '16:00',
                end: '17:30',
              },
              {
                weekday: '목요일',
                start: '16:00',
                end: '17:30',
              },
              {
                weekday: '토요일',
                start: '09:00',
                end: '11:00',
              },
            ],
            bitmasks: [2048, 4096, 8192],
            groupIds: [6, 7, 8],
            prepickedStudentIds: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
            lastSyncTimestamp: 1705123456789,
            status: 'ACTIVE',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '수강신청과목 등록 완료',
      type: Offering,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Offering by ID
//? ---------------------------------------------------------------------- ?//

export const GetOfferingByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 수강신청과목 상세 조회',
      description: `
**📝 기능 설명**
- 특정 수강신청과목의 상세 정보를 조회합니다
- 수강신청한 학생 목록과 함께 제공됩니다
- 현재 신청 현황과 잔여 정원을 확인할 수 있습니다

**🔄 비즈니스 로직**
1. offeringId로 수강신청과목 조회
2. 연관된 수강신청(bookings)과 학생 정보 join
3. 현재 신청자 수와 정원 비교
4. 수강신청 마감 여부 확인
5. 완전한 과목 정보 반환

**⚠️ 중요 제약사항**
- offeringId는 필수 파라미터
- 존재하지 않는 ID는 404 에러 반환
- 삭제된 과목은 조회 불가
- 수강신청 학생 정보 포함

**📚 예시 시나리오**
- 수강신청 현황 확인
- 과목 상세 정보 조회
- 수강신청 관리 페이지 데이터 로딩
      `,
    }),
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 상세 조회 완료',
      type: Offering,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Former Students
//? ---------------------------------------------------------------------- ?//

export const GetFormerStudentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👨‍🎓 이전 수강생 목록 조회',
      description: `
**📝 기능 설명**
- 해당 수강신청과목의 이전 수강생 목록을 조회합니다
- 재수강 우선권 적용 시 참고하는 학생 데이터입니다
- 이전 학기 동일 과목 수강생들의 정보를 제공합니다

**🔄 비즈니스 로직**
1. offeringId로 해당 과목 확인
2. prepickedStudentIds 배열에서 학생 ID 추출
3. 각 학생의 상세 정보 조회
4. 현재 재학 중인 학생만 필터링
5. 이전 수강생 목록 반환

**⚠️ 중요 제약사항**
- offeringId는 필수 파라미터
- prepickedStudentIds가 설정된 과목만 해당
- 졸업생이나 전학생은 제외
- 삭제된 학생 계정은 제외

**📚 예시 시나리오**
- 재수강 우선권 대상자 확인
- 이전 수강생 통계 분석
- 수강신청 우선순위 관리
      `,
    }),
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiOkResponse({
      description: '이전 수강생 목록 조회 완료',
      type: [Student],
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Bookings
//? ---------------------------------------------------------------------- ?//

export const GetBookingsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📋 수강신청 목록 조회',
      description: `
**📝 기능 설명**
- 특정 수강신청과목에 신청한 모든 수강신청(예약) 목록을 조회합니다
- 현재 수강신청 현황과 학생 정보를 확인할 수 있습니다
- 수강신청 상태 및 관리에 필요한 데이터를 제공합니다

**🔄 비즈니스 로직**
1. offeringId로 해당 과목 확인
2. 해당 과목에 대한 모든 활성 수강신청 조회
3. 수강신청한 학생 정보와 함께 반환
4. 수강신청 상태별 정렬 및 필터링
5. 완전한 수강신청 목록 제공

**⚠️ 중요 제약사항**
- offeringId는 필수 파라미터
- 존재하지 않는 offering ID는 404 에러 반환
- 삭제된 과목의 수강신청은 조회 불가
- 수강신청 상태에 따른 접근 권한 적용

**📚 예시 시나리오**
- 수강신청 현황 관리
- 수강생 명단 확인
- 수강신청 승인/거부 처리
- 정원 대비 신청자 수 확인
      `,
    }),
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiOkResponse({
      description: '수강신청 목록 조회 완료',
      type: [Booking],
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Offering
//? ---------------------------------------------------------------------- ?//

export const UpdateOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 수강신청과목 수정',
      description: `
**📝 기능 설명**
- 기존 수강신청과목의 정보를 수정합니다
- 부분 업데이트를 지원하여 필요한 필드만 변경 가능합니다
- 수강신청 진행 중인 과목도 제한적으로 수정할 수 있습니다

**🔄 비즈니스 로직**
1. offeringId로 기존 과목 확인
2. 수정 권한 및 제약사항 검증
3. 변경 가능한 필드만 선별적 업데이트
4. 시간표 충돌 재검사
5. 업데이트된 과목 정보 반환

**⚠️ 중요 제약사항**
- offeringId는 필수 파라미터
- 수강신청 진행 중인 과목은 일부 필드 수정 제한
- 정원 축소 시 기존 신청자 수 고려 필요
- times 변경 시 비트마스크 재계산 필요

**📚 예시 시나리오**
- 과목명이나 반 이름 수정
- 정원 조정
- 수업 시간 변경
- 허용 학년 범위 수정
      `,
    }),
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiBody({
      type: UpdateOfferingDto,
      description: '수정할 수강신청과목 정보 (모든 필드 선택사항)',
      examples: {
        기본정보수정: {
          summary: '과목명과 반 이름 수정',
          description: '과목의 기본 정보만 변경하는 경우',
          value: {
            lessonName: '변경된 과목명',
            groupName: '변경된 반 이름',
          },
        },
        정원조정: {
          summary: '수강신청 정원 조정',
          description: '정원을 늘리거나 줄이는 경우',
          value: {
            capacity: 25,
            prepicked: 8,
          },
        },
        시간표변경: {
          summary: '수업 시간 변경',
          description: '수업 요일이나 시간을 수정하는 경우',
          value: {
            times: [
              {
                weekday: '수요일',
                start: '14:00',
                end: '15:00',
              },
              {
                weekday: '금요일',
                start: '14:00',
                end: '15:00',
              },
            ],
            bitmasks: [256, 4096],
          },
        },
        허용학년변경: {
          summary: '허용 학년 범위 수정',
          description: '수강 가능한 학년을 조정하는 경우',
          value: {
            allowedGrades: [4, 5, 6],
          },
        },
        수강신청규칙변경: {
          summary: '수강신청 방식 변경',
          description: '선착순에서 무작위로 변경하는 등',
          value: {
            pickRule: '무작위',
            status: 'ACTIVE',
          },
        },
        이전수강생추가: {
          summary: '이전 수강생 ID 목록 업데이트',
          description: '재수강 우선권 대상자를 추가하는 경우',
          value: {
            prepickedStudentIds: [50, 51, 52, 53, 54, 55],
            prepicked: 6,
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 업데이트 완료',
      type: Offering,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Remove Offering
//? ---------------------------------------------------------------------- ?//

export const RemoveOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 수강신청과목 삭제',
      description: `
**📝 기능 설명**
- 특정 수강신청과목을 삭제합니다
- 소프트 삭제 방식으로 데이터 복구가 가능합니다
- 관련된 수강신청 데이터도 함께 처리됩니다

**🔄 비즈니스 로직**
1. offeringId로 대상 과목 확인
2. 활성 수강신청 존재 여부 검사
3. 소프트 삭제 처리 (deletedAt 설정)
4. 관련 수강신청 데이터 정리
5. 삭제된 과목 정보 반환

**⚠️ 중요 제약사항**
- offeringId는 필수 파라미터
- 수강신청이 진행 중인 과목은 삭제 제한
- 이미 삭제된 과목은 중복 삭제 불가
- 관리자 권한 필요

**📚 예시 시나리오**
- 개설 취소된 과목 삭제
- 중복 생성된 과목 정리
- 학기 종료 후 데이터 정리
      `,
    }),
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 삭제 완료',
      type: Offering,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
