import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { ResponseSchoolTermComboDto } from '../dto/response-school-term-combo.dto';

//? ---------------------------------------------------------------------- ?//
//? Get School Term Combo
//? ---------------------------------------------------------------------- ?//

export const GetSchoolTermComboDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔄 학교-학기 통합 데이터 조회',
      description: `
### 📋 기능 개요
- 특정 학교의 특정 학기에 대한 모든 관련 정보를 한 번에 조회합니다
- 수업(Lessons), 강사(Sams), 학생(Students) 정보를 통합적으로 제공합니다
- 프론트엔드에서 여러 API 호출 없이 필요한 모든 데이터를 한 번에 수집 가능합니다

### 🎯 제공되는 데이터
- **Lessons**: 해당 학기에 개설된 모든 수업/강좌 정보
  - 수업명, 카테고리, 대상 학년, 일정, 장소, 수강료 등
  - 현재 신청 인원과 최대 수용 인원 정보
  - 수업 상태 및 운영 정보
- **Sams**: 해당 학기에 참여하는 모든 강사 정보
  - 강사 기본 정보 (이름, 연락처, 이메일)
  - 전문 분야 및 경력 정보
  - 계약 상태 및 담당 수업 연결 정보
- **Students**: 해당 학기에 등록된 모든 학생 정보
  - 학생 기본 정보 (이름, 학년, 반)
  - 학부모 연락처 정보
  - 수강신청 현황 및 상태

### 📝 URL 파라미터
- **schoolId**: 조회할 학교의 고유 식별자 (숫자)
- **termId**: 조회할 학기의 고유 식별자 (숫자)

### 🔍 데이터 조회 로직
1. **Lessons 조회**: term.id와 school.id를 기준으로 해당 학기의 모든 수업 조회
2. **Sams 조회**: 수업과 연결된 계약을 통해 해당 학기에 참여하는 강사들을 중복 제거하여 조회
3. **Students 조회**: 수강신청(picks)을 통해 해당 학기에 등록된 학생들을 중복 제거하여 조회

### ✅ 성공 응답
- **HTTP 200**: 조회 성공
- **응답 데이터**: 통합된 학교-학기 정보

### 📊 응답 예시
\`\`\`json
{
  "lessons": [
    {
      "id": 1,
      "lessonName": "영어회화 초급반",
      "category": "언어",
      "grade": "1,2,3",
      "maxStudents": 20,
      "currentStudents": 15,
      "weekday": "MONDAY",
      "startTime": "09:00",
      "endTime": "10:30",
      "location": "영어실",
      "fee": 50000,
      "status": "ACTIVE"
    },
    {
      "id": 2,
      "lessonName": "창의 미술교실",
      "category": "예술",
      "grade": "1,2,3,4",
      "maxStudents": 15,
      "currentStudents": 12,
      "weekday": "WEDNESDAY",
      "startTime": "14:00",
      "endTime": "15:30",
      "location": "미술실",
      "fee": 45000,
      "status": "ACTIVE"
    }
  ],
  "sams": [
    {
      "id": 1,
      "name": "김영희",
      "phone": "01012345678",
      "email": "kim@example.com",
      "specialty": "영어교육",
      "career": "10년",
      "status": "ACTIVE"
    },
    {
      "id": 2,
      "name": "박미술",
      "phone": "01087654321",
      "email": "park@example.com",
      "specialty": "미술교육",
      "career": "7년",
      "status": "ACTIVE"
    }
  ],
  "students": [
    {
      "id": 1,
      "studentName": "홍길동",
      "grade": 3,
      "className": "3학년 1반",
      "phone": "01011111111",
      "parentName": "홍아버지",
      "parentPhone": "01022222222",
      "status": "ACTIVE"
    },
    {
      "id": 2,
      "studentName": "이영수",
      "grade": 2,
      "className": "2학년 3반",
      "phone": "01033333333",
      "parentName": "이어머니",
      "parentPhone": "01044444444",
      "status": "ACTIVE"
    }
  ]
}
\`\`\`

### ❌ 실패 케이스
- **400 Bad Request**: 잘못된 요청 파라미터
  - schoolId나 termId가 숫자가 아닌 경우
  - 유효하지 않은 ID 값 (0 이하)
- **404 Not Found**: 존재하지 않는 리소스
  - 해당 schoolId의 학교가 존재하지 않는 경우
  - 해당 termId의 학기가 존재하지 않는 경우
  - 해당 학교에 해당 학기가 존재하지 않는 경우

### 💡 활용 예시
- **관리자 대시보드**: 학기별 전체 현황 파악
- **수강신청 시스템**: 수업-강사-학생 연계 정보 표시
- **출석 관리**: 해당 학기의 모든 관련 주체 정보 조회
- **통계 리포트**: 학기별 운영 현황 분석
- **모바일 앱**: 한 번의 호출로 필요한 모든 정보 로드

### 🔧 성능 최적화
- **중복 제거**: sams와 students 조회 시 DISTINCT 적용
- **조인 최적화**: 필요한 관계만 선택적으로 조인
- **캐시 적용**: 자주 조회되는 데이터에 대한 캐싱 고려 가능

### 🔒 접근 권한
- **Public API**: 인증 없이 접근 가능
- **조회 전용**: 데이터 수정 기능 없음
- **읽기 권한**: 모든 사용자가 조회 가능

### 📈 데이터 상태 정보
- **실시간 반영**: 수강신청 변경사항이 즉시 반영됨
- **동기화**: 모든 관련 테이블의 최신 상태 조회
- **일관성**: 트랜잭션 단위로 데이터 무결성 보장
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '조회할 학교의 고유 식별자 - 시스템에 등록된 학교 ID',
      example: 1,
      required: true,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '조회할 학기의 고유 식별자 - 해당 학교의 특정 학기 ID',
      example: 1,
      required: true,
    }),
    ApiExtraModels(ResponseSchoolTermComboDto, Lesson, Sam, Student),
    ApiOkResponse({
      description:
        '학교-학기 통합 데이터 조회 성공 - 수업, 강사, 학생 정보 통합 제공',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseSchoolTermComboDto) },
          {
            properties: {
              lessons: {
                type: 'array',
                items: { $ref: getSchemaPath(Lesson) },
                description: '해당 학기에 개설된 모든 수업/강좌 목록',
              },
              sams: {
                type: 'array',
                items: { $ref: getSchemaPath(Sam) },
                description: '해당 학기에 참여하는 모든 강사 목록',
              },
              students: {
                type: 'array',
                items: { $ref: getSchemaPath(Student) },
                description: '해당 학기에 등록된 모든 학생 목록',
              },
            },
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};
