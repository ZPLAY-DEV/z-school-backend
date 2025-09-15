import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';

//? ---------------------------------------------------------------------- ?//
//? Start Attendance Notification
//? ---------------------------------------------------------------------- ?//
export const StartAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Start attendance check for a group',
      description: `
### Overview
Initiates attendance check for a specific group. **Must be called with all students' attendance status**.

### Request Body
\`CreateAttendanceWithKeyDto[]\` - Array of student attendance status objects

**Required fields:**
- \`groupKey\`: Group identifier (format: GROUP#{groupId})
- \`dailyStudentKey\`: Daily student key (format: DATE#{date}#STUDENT#{studentId}#{classInfo})
- \`status\`: Attendance status (PRESENT, ABSENT, LATE, LEFT, etc.)

**Optional fields:**
- \`parentNote\`: Message from parent to school
- \`schoolNote\`: Message from school to parent

### Response
Returns the number of students notified.

### Use Cases
- Automatic call at class start time
- Manual attendance check initiation by instructor
- Late student management
      `,
    }),
    ApiBody({
      description: 'Student attendance status array',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            groupKey: {
              type: 'string',
              description: 'Group identifier (format: GROUP#{groupId})',
              example: 'GROUP#25',
            },
            dailyStudentKey: {
              type: 'string',
              description:
                'Daily student key (format: DATE#{date}#STUDENT#{studentId}#{classInfo})',
              example: 'DATE#2025-08-18#STUDENT#343#3-1-12',
            },
            status: {
              type: 'string',
              description: 'Attendance status',
              enum: [
                'PRESENT',
                'ABSENT',
                'LATE',
                'LEFT',
                'EXCUSED_ABSENT',
                'EXCUSED_LATE',
                'EXCUSED_LEFT',
              ],
              example: 'PRESENT',
            },
            parentNote: {
              type: 'string',
              description: 'Message from parent to school',
              example: '감사합니다.',
            },
            schoolNote: {
              type: 'string',
              description: 'Message from school to parent',
              example: '감사합니다.',
            },
          },
          required: ['groupKey', 'dailyStudentKey', 'status'],
        },
        example: [
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#343#3-1-12',
            status: 'LEFT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#356#3-2-03',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#371#3-2-18',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#377#3-3-02',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#397#3-3-22',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#407#3-4-10',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#443#3-6-02',
            status: 'EXCUSED_ABSENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#567#4-4-09',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#592#4-5-10',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#706#5-4-10',
            status: 'PRESENT',
          },
        ],
      },
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: 'Group ID',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: 'Attendance start notification sent successfully',
      type: Number,
      isArray: false,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? End Attendance Notification
//? ---------------------------------------------------------------------- ?//
export const EndAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'End attendance check for a group',
      description: `
### Overview
Finalizes attendance check for a specific group. **Must be called with all students' attendance status**.

### Request Body
\`CreateAttendanceWithKeyDto[]\` - Array of final student attendance status objects

**Required fields:**
- \`groupKey\`: Group identifier (format: GROUP#{groupId})
- \`dailyStudentKey\`: Daily student key (format: DATE#{date}#STUDENT#{studentId}#{classInfo})
- \`status\`: Final attendance status (PRESENT, ABSENT, LATE, LEFT, etc.)

**Optional fields:**
- \`parentNote\`: Message from parent to school
- \`schoolNote\`: Message from school to parent

### Response
Returns the number of students processed.

### Use Cases
- Automatic call at class end time
- Manual attendance completion by instructor
- Daily attendance cleanup
      `,
    }),
    ApiBody({
      description: 'Student attendance status array',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            groupKey: {
              type: 'string',
              description: 'Group identifier (format: GROUP#{groupId})',
              example: 'GROUP#25',
            },
            dailyStudentKey: {
              type: 'string',
              description:
                'Daily student key (format: DATE#{date}#STUDENT#{studentId}#{classInfo})',
              example: 'DATE#2025-08-18#STUDENT#343#3-1-12',
            },
            status: {
              type: 'string',
              description: 'Attendance status',
              enum: [
                'PRESENT',
                'ABSENT',
                'LATE',
                'LEFT',
                'EXCUSED_ABSENT',
                'EXCUSED_LATE',
                'EXCUSED_LEFT',
              ],
              example: 'PRESENT',
            },
            parentNote: {
              type: 'string',
              description: 'Message from parent to school',
              example: '감사합니다.',
            },
            schoolNote: {
              type: 'string',
              description: 'Message from school to parent',
              example: '감사합니다.',
            },
          },
          required: ['groupKey', 'dailyStudentKey', 'status'],
        },
        example: [
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#343#3-1-12',
            status: 'LEFT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#356#3-2-03',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#371#3-2-18',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#377#3-3-02',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#397#3-3-22',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#407#3-4-10',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#443#3-6-02',
            status: 'EXCUSED_ABSENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#567#4-4-09',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#592#4-5-10',
            status: 'PRESENT',
          },
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#706#5-4-10',
            status: 'PRESENT',
          },
        ],
      },
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: 'Group ID',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: 'Attendance end processing completed successfully',
      type: Number,
      isArray: false,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Custom Attendance Notification
//? ---------------------------------------------------------------------- ?//
export const CustomAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Process custom attendance for a group',
      description: `
### Overview
Processes attendance for a small number of students in a group using custom logic.
**Will send notification to parents. Therefore, must be called with "schoolNote".**

### Request Body
\`CreateAttendanceWithKeyDto[]\` - Array of student attendance status objects

**Required fields:**
- \`groupKey\`: Group identifier (format: GROUP#{groupId})
- \`dailyStudentKey\`: Daily student key (format: DATE#{date}#STUDENT#{studentId}#{classInfo})
- \`status\`: Attendance status (PRESENT, ABSENT, LATE, LEFT, etc.)
- \`schoolNote\`: Message from school to parent (required for notifications)

**Optional fields:**
- \`parentNote\`: Message from parent to school (**not used with this API**)

### Response
Returns the number of students processed.

### Use Cases
- Sam updates individual student attendance status
- Manager updates attendance status for multiple students

### Features
- Direct attendance status setting bypassing standard procedures
- Real-time notification system integration
- Immediate attendance record reflection
      `,
    }),
    ApiBody({
      description: 'Student attendance status array with school note',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            groupKey: {
              type: 'string',
              description: 'Group identifier (format: GROUP#{groupId})',
              example: 'GROUP#25',
            },
            dailyStudentKey: {
              type: 'string',
              description:
                'Daily student key (format: DATE#{date}#STUDENT#{studentId}#{classInfo})',
              example: 'DATE#2025-08-18#STUDENT#567#4-4-09',
            },
            status: {
              type: 'string',
              description: 'Attendance status',
              enum: [
                'PRESENT',
                'ABSENT',
                'LATE',
                'LEFT',
                'EXCUSED_ABSENT',
                'EXCUSED_LATE',
                'EXCUSED_LEFT',
              ],
              example: 'LEFT',
            },
            parentNote: {
              type: 'string',
              description: 'Message from parent to school',
              example: '감사합니다.',
            },
            schoolNote: {
              type: 'string',
              description:
                'Message from school to parent (required for notifications)',
              example: '급똥으로 인한 조퇴.',
            },
          },
          required: ['groupKey', 'dailyStudentKey', 'status', 'schoolNote'],
        },
        example: [
          {
            groupKey: 'GROUP#25',
            dailyStudentKey: 'DATE#2025-08-18#STUDENT#567#4-4-09',
            status: 'LEFT',
            schoolNote: '급똥으로 인한 조퇴.',
          },
        ],
      },
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: 'Group ID',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: 'Custom attendance processing completed successfully',
      type: Number,
      isArray: false,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Upsert Attendance
//? ---------------------------------------------------------------------- ?//
export const UpsertAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Create or update attendance for a specific student',
      description: `
### Overview
Creates or updates attendance information for a specific student on a given date.

### Request Body
\`CreateAttendanceWithGroupStudentDto\` - Student attendance information

**Required fields:**
- \`status\`: Attendance status (PRESENT, ABSENT, LATE, LEFT, EXCUSED_ABSENT, EXCUSED_LATE, EXCUSED_LEFT)

**Optional fields:**
- \`parentNote\`: Message from parent to school
- \`schoolNote\`: Message from school to parent

### Response
Returns the created or updated attendance object.

### Use Cases
- Real-time attendance checking by instructor
- Attendance correction by administrator
- Pre-notification processing (hospital visits, early leave, etc.)

### Attendance Status Types
- **PRESENT**: Present, **ABSENT**: Absent, **LATE**: Late, **LEFT**: Early leave
- **EXCUSED_***: Pre-notified statuses (excused absence, excused late, excused early leave)

### Notes
- Returns error if no class exists on the specified date
- Returns error if group or student does not exist
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: 'Group ID',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: 'Attendance date (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiParam({
      name: 'studentId',
      type: 'number',
      description: 'Student ID',
      example: 456,
    }),
    ApiOkResponseTemplate({
      description: 'Attendance created or updated successfully',
      type: Object,
      isArray: false,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Attendance by Date
//? ---------------------------------------------------------------------- ?//
export const FindAttendanceByDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 특정 날짜 반별 출석 조회',
      description: `
### 🎯 기능 개요
특정 반의 특정 날짜에 대한 출석 정보를 DynamoDB에서 실시간 조회합니다.
해당 날짜의 모든 학생 출석 정보를 배열로 반환합니다.

### 📋 매개변수
- \`groupId\`: 조회할 반 ID (숫자)
- \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)

### 📊 응답 데이터
- 각 학생의 출석 정보 (학생명, 수업 정보, 출석 상태 포함)
- DynamoDB 키 구조: GROUP#{groupId}, DATE#{date}#STUDENT#{studentId}

### 🏷️ 출석 상태 종류
INIT, PRESENT, ABSENT, LATE, LEFT, EXCUSED_ABSENT, EXCUSED_LATE, EXCUSED_LEFT

### 💡 주요 활용
- 강사의 실시간 출석 확인
- 학부모의 자녀 출석 상태 조회  
- 관리자의 반별 출석 현황 모니터링
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: '조회할 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponse({
      description: '출석 정보 조회 성공',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            groupKey: {
              type: 'string',
              example: 'GROUP#123',
            },
            dailyStudentKey: {
              type: 'string',
              example: 'DATE#2025-01-15#STUDENT#1학년1반-10',
            },
            studentName: {
              type: 'string',
              example: '홍길동',
            },
            lessonName: {
              type: 'string',
              example: '수학',
            },
            status: {
              type: 'string',
              enum: ['INIT', 'PRESENT', 'ABSENT', 'LATE', 'LEFT'],
              example: 'PRESENT',
            },
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Attendance by Date with Extended Data
//? ---------------------------------------------------------------------- ?//
export const FindAttendanceByDateWithExtendedDataDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 특정 날짜 반별 출석 조회 (확장 정보 포함)',
      description: `
### 🎯 기능 개요
특정 반의 특정 날짜 출석 정보를 조회하되, 다음 수업 정보나 하교 목적지까지 포함하여 반환합니다.
수업 종료 후 학생 안내나 학부모 알림에 활용됩니다.

### 📋 매개변수
- \`groupId\`: 조회할 반 ID (숫자)
- \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)

### 📊 확장 정보
- \`next\`: 해당 학생의 다음 수업명 또는 하교 목적지
- \`student\`: 학생 상세 정보 (학년, 반, 학부모 정보 포함)

### 💡 주요 활용
- 수업 종료 후 다음 수업 장소 안내
- 하교 시간 결정 및 학부모 알림
- 학생 동선 관리 및 안전 확보

### ⚠️ 주의사항
- 일반 조회보다 응답 데이터가 크므로 필요시에만 사용
- 개인정보 포함으로 권한 확인 필요
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: '조회할 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponse({
      description: '출석 정보 조회 성공 (확장 정보 포함)',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            studentName: {
              type: 'string',
              example: '홍길동',
            },
            status: {
              type: 'string',
              example: 'PRESENT',
            },
            next: {
              type: 'string',
              description: '다음 수업명 또는 하교 목적지',
              example: '국어 수업',
            },
            student: {
              type: 'object',
              description: '학생 상세 정보',
            },
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Attendance Report
//? ---------------------------------------------------------------------- ?//
export const GetReportDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📊 반별 출석 리포트 조회',
      description: `
### 🎯 기능 개요
특정 반의 특정 날짜에 대한 출석 리포트를 학생별로 그룹화하여 조회합니다.
각 학생의 출석 기록이 날짜순으로 정렬되어 제공됩니다.

### 📋 매개변수
- \`groupId\`: 조회할 반 ID (숫자)
- \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)

### 📊 응답 데이터
- 학생별로 그룹화된 출석 리포트
- 각 학생의 출석 기록 배열 (날짜순 정렬)

### 💡 주요 활용
- 반별 출석 현황 한눈에 파악
- 학생별 출석 패턴 분석
- 출석 통계 생성용 데이터 수집
- 학부모 리포트 생성

### 📈 데이터 구조
- studentKey: 학생 식별자
- studentName: 학생 이름
- attendances: 출석 기록 배열 (날짜별 상태)
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: '조회할 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponse({
      description: '출석 리포트 조회 성공',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            studentKey: {
              type: 'string',
              example: 'STUDENT#1학년1반-10',
            },
            studentName: {
              type: 'string',
              example: '홍길동',
            },
            attendances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    example: '2025-01-15',
                  },
                  status: {
                    type: 'string',
                    example: 'PRESENT',
                  },
                },
              },
            },
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Student Monthly Report
//? ---------------------------------------------------------------------- ?//
export const GetStudentMonthlyReportDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📊 Get student monthly attendance report',
      description: `
### Overview
Retrieves monthly attendance data for a specific student in a group.
Returns all attendance records for the specified month filtered by student ID.

### Parameters
- \`groupId\`: Group ID (number)
- \`month\`: Target month (YYYY-MM format, e.g., "2025-08")
- \`studentId\`: Student ID (number)

### Response
Returns an array of attendance records for the specified student in the given month.

### Use Cases
- Monthly attendance analysis for individual students
- Parent portal monthly attendance display
- Student attendance pattern analysis
- Academic performance tracking

### Data Structure
- Each record contains daily attendance information
- Records are filtered by student ID from monthly data
- DynamoDB query uses beginsWith on dailyStudentKey with month prefix

### Performance Notes
- Uses DynamoDB beginsWith query for efficient monthly data retrieval
- Client-side filtering by student ID for precise results
- Optimized for monthly report generation
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: 'Group ID',
      example: 123,
    }),
    ApiParam({
      name: 'month',
      type: 'string',
      description: 'Target month (YYYY-MM format)',
      example: '2025-08',
    }),
    ApiParam({
      name: 'studentId',
      type: 'number',
      description: 'Student ID',
      example: 456,
    }),
    ApiOkResponse({
      description: 'Student monthly attendance report retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            groupKey: {
              type: 'string',
              example: 'GROUP#123',
            },
            dailyStudentKey: {
              type: 'string',
              example: 'DATE#2025-08-15#STUDENT#456#3-1-12',
            },
            studentName: {
              type: 'string',
              example: 'John Doe',
            },
            lessonName: {
              type: 'string',
              example: 'Mathematics',
            },
            status: {
              type: 'string',
              enum: [
                'INIT',
                'PRESENT',
                'ABSENT',
                'LATE',
                'LEFT',
                'EXCUSED_ABSENT',
                'EXCUSED_LATE',
                'EXCUSED_LEFT',
              ],
              example: 'PRESENT',
            },
            parentNote: {
              type: 'string',
              example: 'Thank you for your attention.',
            },
            schoolNote: {
              type: 'string',
              example: 'Student participated well in class.',
            },
            parentNotedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-08-15T09:00:00Z',
            },
            schoolNotedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-08-15T09:00:00Z',
            },
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Download Monthly Report Excel
//? ---------------------------------------------------------------------- ?//

export const DownloadMonthlyReportExcelDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📥 월별 출석 보고서 Excel 다운로드',
      description: `
**📝 기능 설명**
- 특정 반의 월별 출석 보고서를 Excel 파일(.xlsx)로 다운로드합니다
- 해당 월의 모든 학생 출석 정보를 체계적으로 정리하여 제공합니다
- 파일명은 '{month}-group-report.xlsx' 형식으로 자동 생성됩니다

**📋 Excel 파일 구성**
- **A열**: 날짜 (YYYY-MM-DD)
- **B열**: 학생명
- **C열**: 수업명
- **D열**: 출석 상태
- **E열**: 학부모 메모
- **F열**: 학교 메모
- **G열**: 학부모 메모 작성 시간
- **H열**: 학교 메모 작성 시간

**🔄 비즈니스 로직**
1. 그룹 ID와 월 정보로 해당 기간 출석 데이터 조회
2. DynamoDB에서 월별 출석 정보 수집
3. Excel 워크북 생성 및 데이터 입력
4. 파일 스트림으로 응답 전송

**📚 예시 시나리오**
- 월말 출석 현황 보고서 작성
- 학부모 상담용 출석 자료 제공
- 학교 행정 업무용 출석 통계
- 학생별 출석 패턴 분석

**⚠️ 중요 사항**
- 파일은 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet 형식
- Content-Disposition 헤더로 파일명 지정
- 대용량 데이터의 경우 스트리밍 방식으로 처리
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: Number,
      description: '반 ID - 출석 보고서를 다운로드할 반의 고유 식별자',
      example: 123,
    }),
    ApiParam({
      name: 'month',
      type: String,
      description: '대상 월 (YYYY-MM 형식) - 출석 보고서를 생성할 월',
      example: '2025-08',
    }),
    ApiResponse({
      status: 200,
      description: 'Excel 파일 다운로드 성공',
      schema: {
        type: 'string',
        format: 'binary',
        description: '월별 출석 보고서가 포함된 Excel 파일 (.xlsx)',
      },
      headers: {
        'Content-Type': {
          description: 'Excel 파일 MIME 타입',
          schema: {
            type: 'string',
            example:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        },
        'Content-Disposition': {
          description: '파일 다운로드 헤더',
          schema: {
            type: 'string',
            example: 'attachment; filename="2025-08-group-report.xlsx"',
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 반 또는 데이터 없음',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Group not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
