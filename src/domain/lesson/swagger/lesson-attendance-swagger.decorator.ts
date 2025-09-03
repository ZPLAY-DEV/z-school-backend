import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';

//? ============================================================================ ?//
//? Find Attendance By Date
//? ============================================================================ ?//

export const FindAttendanceByDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📋 특정 날짜 출석 현황 조회',
      description: `
### 📋 과목별 특정 날짜 출석 현황 조회

**기능 개요:**
- 특정 과목의 특정 날짜에 해당하는 모든 출석 정보를 조회합니다
- DynamoDB에서 실시간 출석 데이터를 가져와 현재 상태를 제공합니다

**조회 대상:**
- ✅ **해당 날짜 수업**: 지정된 날짜에 수업이 있는 모든 반
- ✅ **등록 학생**: 각 반에 등록된 모든 확정 수강생
- ✅ **출석 상태**: 각 학생의 실시간 출석 상태

**DynamoDB 스키마 구조:**
- **Partition Key**: \`GROUP#{groupId}\`
- **Sort Key**: \`DATE#{date}#STUDENT#{studentId}\`
- **출석 상태**: INIT, PRESENT, ABSENT, LATE, LEFT, EXCUSED_*

**출석 상태 설명:**
- 🟢 **PRESENT**: 출석
- 🔴 **ABSENT**: 결석
- 🟡 **LATE**: 지각
- 🟠 **LEFT**: 조퇴
- 🔵 **EXCUSED_ABSENT**: 공결
- 🔵 **EXCUSED_LATE**: 공지각
- 🔵 **EXCUSED_LEFT**: 공조퇴
- ⚪ **INIT**: 미처리 (기본 상태)

**반환 데이터:**
- 그룹 정보 (ID, 이름)
- 학생 정보 (ID, 이름)
- 수업 정보 (시간, 장소)
- 출석 상태 및 메모
- 타임스탬프 정보

**사용 시나리오:**
- 일일 출석 현황 확인
- 출석부 작성 및 수정
- 학부모 출석 알림 발송
- 출석 통계 분석 기초 데이터
      `,
    }),
    ApiParam({
      name: 'lessonId',
      type: Number,
      description: '출석 현황을 조회할 과목의 고유 ID',
      example: 1,
    }),
    ApiParam({
      name: 'date',
      type: String,
      description: '조회할 날짜 (YYYY-MM-DD 형식)',
      example: '2024-12-30',
    }),
    ApiOkResponse({
      description: '특정 날짜 출석 현황 조회 성공',
      schema: {
        type: 'array',
        description: '출석 기록 배열',
        items: {
          type: 'object',
          description: 'DynamoDB 출석 기록 구조',
          properties: {
            groupKey: {
              type: 'string',
              description: 'DynamoDB Partition Key (GROUP#{groupId})',
              example: 'GROUP#1',
            },
            dailyStudentKey: {
              type: 'string',
              description:
                'DynamoDB Sort Key (DATE#{date}#STUDENT#{studentId})',
              example: 'DATE#2024-12-30#STUDENT#1학년1반-10',
            },
            lessonId: {
              type: 'number',
              description: '과목 ID',
              example: 1,
            },
            lessonName: {
              type: 'string',
              description: '과목명',
              example: '초등 영어 A반',
            },
            groupId: {
              type: 'number',
              description: '그룹(반) ID',
              example: 1,
            },
            groupName: {
              type: 'string',
              description: '그룹(반) 이름',
              example: '영어 A반',
            },
            studentId: {
              type: 'string',
              description: '학생 고유 식별자',
              example: '1학년1반-10',
            },
            studentName: {
              type: 'string',
              description: '학생 이름',
              example: '홍길동',
            },
            date: {
              type: 'string',
              description: '수업 날짜 (YYYY-MM-DD)',
              example: '2024-12-30',
            },
            start: {
              type: 'string',
              description: '수업 시작 시간 (HH:MM)',
              example: '14:00',
            },
            end: {
              type: 'string',
              description: '수업 종료 시간 (HH:MM)',
              example: '14:40',
            },
            weekday: {
              type: 'string',
              description: '수업 요일 (e.g. "월")',
              example: '월',
            },
            location: {
              type: 'string',
              description: '수업 장소',
              example: '영어교실 1',
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
              description: '출석 상태',
              example: 'PRESENT',
            },
            parentNote: {
              type: 'string',
              description: '학부모 메모',
              nullable: true,
              example: '치과 치료로 인한 지각',
            },
            schoolNote: {
              type: 'string',
              description: '학교/강사 메모',
              nullable: true,
              example: '공결 처리 완료',
            },
            createdAt: {
              type: 'number',
              description: '최초 생성 시간 (Unix timestamp)',
              nullable: true,
              example: 1703905200,
            },
            updatedAt: {
              type: 'number',
              description: '최종 수정 시간 (Unix timestamp)',
              nullable: true,
              example: 1703905800,
            },
            isRead: {
              type: 'boolean',
              description: '학부모 확인 여부',
              nullable: true,
              example: true,
            },
          },
        },
      },
      examples: {
        success: {
          summary: '성공적인 출석 현황 조회',
          value: [
            {
              groupKey: 'GROUP#1',
              dailyStudentKey: 'DATE#2024-12-30#STUDENT#1학년1반-10',
              lessonId: 1,
              lessonName: '초등 영어 A반',
              groupId: 1,
              groupName: '영어 A반',
              studentId: '1학년1반-10',
              studentName: '홍길동',
              date: '2024-12-30',
              start: '14:00',
              end: '14:40',
              weekday: '월',
              location: '영어교실 1',
              status: 'PRESENT',
              parentNote: null,
              schoolNote: '정상 출석',
              createdAt: 1703905200,
              updatedAt: 1703905200,
              isRead: true,
            },
            {
              groupKey: 'GROUP#1',
              dailyStudentKey: 'DATE#2024-12-30#STUDENT#1학년2반-05',
              lessonId: 1,
              lessonName: '초등 영어 A반',
              groupId: 1,
              groupName: '영어 A반',
              studentId: '1학년2반-05',
              studentName: '김영희',
              date: '2024-12-30',
              start: '14:00',
              end: '14:40',
              weekday: '월',
              location: '영어교실 1',
              status: 'LATE',
              parentNote: '교통 체증으로 인한 지각',
              schoolNote: '5분 지각, 적극 참여',
              createdAt: 1703905200,
              updatedAt: 1703905500,
              isRead: false,
            },
            {
              groupKey: 'GROUP#1',
              dailyStudentKey: 'DATE#2024-12-30#STUDENT#1학년3반-08',
              lessonId: 1,
              lessonName: '초등 영어 A반',
              groupId: 1,
              groupName: '영어 A반',
              studentId: '1학년3반-08',
              studentName: '박철수',
              date: '2024-12-30',
              start: '14:00',
              end: '14:40',
              weekday: '월',
              location: '영어교실 1',
              status: 'EXCUSED_ABSENT',
              parentNote: '독감으로 인한 결석',
              schoolNote: '병결 처리',
              createdAt: 1703905200,
              updatedAt: 1703905800,
              isRead: true,
            },
          ],
        },
        noAttendance: {
          summary: '해당 날짜에 수업이 없는 경우',
          value: [],
        },
        holiday: {
          summary: '휴일인 경우 (수업 없음)',
          value: [],
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ============================================================================ ?//
//? Get Attendance Report
//? ============================================================================ ?//

export const GetReportDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📊 출석 리포트 생성',
      description: `
### 📊 과목별 특정 날짜 출석 리포트 조회

**기능 개요:**
- 특정 과목의 특정 날짜 출석 데이터를 분석하여 리포트 형태로 제공합니다
- 학생별로 출석 정보를 그룹화하고 통계 정보를 포함합니다

**리포트 구성:**
- ✅ **학생별 그룹화**: 각 학생의 출석 기록을 날짜순으로 정렬
- ✅ **출석 패턴 분석**: 학생별 출석률 및 경향 파악
- ✅ **상태별 집계**: 출석, 결석, 지각, 조퇴 등 상태별 통계
- ✅ **메모 정보**: 학부모 및 학교 메모 포함

**분석 기능:**
- 🔍 **출석률 계산**: 전체 수업 대비 출석 비율
- 🔍 **지각 빈도**: 지각 패턴 분석
- 🔍 **결석 사유**: 공결/무단결석 구분
- 🔍 **부모 참여도**: 메모 작성 및 확인 빈도

**데이터 처리:**
1. **원본 데이터 수집**: DynamoDB에서 출석 기록 조회
2. **학생별 그룹화**: studentKey 기준으로 데이터 분류
3. **날짜순 정렬**: 시간순으로 출석 기록 배열
4. **통계 계산**: 각종 출석 지표 산출

**사용 시나리오:**
- 📈 **출석 분석**: 학생별 출석 패턴 파악
- 📋 **상담 자료**: 학부모 상담 시 출석 현황 제시
- 📊 **통계 보고**: 학교 관리자용 출석 통계
- 🎯 **개선 방안**: 출석률 향상을 위한 데이터 분석

**주의사항:**
- 개인정보 보호를 위해 적절한 권한 확인 필요
- 대량 데이터 조회 시 성능 고려
- 실시간 데이터 반영으로 최신 정보 제공
      `,
    }),
    ApiParam({
      name: 'lessonId',
      type: Number,
      description: '리포트를 생성할 과목의 고유 ID',
      example: 1,
    }),
    ApiParam({
      name: 'date',
      type: String,
      description: '리포트 대상 날짜 (YYYY-MM-DD 형식)',
      example: '2024-12-30',
    }),
    ApiOkResponse({
      description: '출석 리포트 생성 성공',
      schema: {
        type: 'array',
        description: '학생별 출석 리포트 배열',
        items: {
          type: 'object',
          description: '학생별 출석 리포트 구조',
          properties: {
            studentKey: {
              type: 'string',
              description: '학생 고유 식별자',
              example: '1학년1반-10',
            },
            studentName: {
              type: 'string',
              description: '학생 이름',
              example: '홍길동',
            },
            studentGrade: {
              type: 'number',
              description: '학년',
              example: 1,
            },
            studentClass: {
              type: 'string',
              description: '학교 반',
              example: '1반',
            },
            groupName: {
              type: 'string',
              description: '수강 반 이름',
              example: '영어 A반',
            },
            totalClasses: {
              type: 'number',
              description: '전체 수업 횟수',
              example: 20,
            },
            attendanceCount: {
              type: 'number',
              description: '출석 횟수',
              example: 18,
            },
            absentCount: {
              type: 'number',
              description: '결석 횟수',
              example: 1,
            },
            lateCount: {
              type: 'number',
              description: '지각 횟수',
              example: 1,
            },
            excusedCount: {
              type: 'number',
              description: '공결 횟수',
              example: 0,
            },
            attendanceRate: {
              type: 'number',
              description: '출석률 (%)',
              example: 90.0,
            },
            attendances: {
              type: 'array',
              description: '출석 기록 상세 배열',
              items: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    description: '수업 날짜',
                    example: '2024-12-30',
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
                    description: '출석 상태',
                    example: 'PRESENT',
                  },
                  start: {
                    type: 'string',
                    description: '수업 시작 시간',
                    example: '14:00',
                  },
                  end: {
                    type: 'string',
                    description: '수업 종료 시간',
                    example: '14:40',
                  },
                  parentNote: {
                    type: 'string',
                    description: '학부모 메모',
                    nullable: true,
                    example: '정상 출석',
                  },
                  schoolNote: {
                    type: 'string',
                    description: '학교 메모',
                    nullable: true,
                    example: '적극적 참여',
                  },
                  isRead: {
                    type: 'boolean',
                    description: '확인 여부',
                    example: true,
                  },
                  updatedAt: {
                    type: 'number',
                    description: '최종 수정 시간',
                    example: 1703905200,
                  },
                },
              },
            },
            lastUpdate: {
              type: 'number',
              description: '최근 출석 기록 업데이트 시간',
              example: 1703905800,
            },
            parentEngagement: {
              type: 'object',
              description: '학부모 참여도 지표',
              properties: {
                noteCount: {
                  type: 'number',
                  description: '작성한 메모 수',
                  example: 5,
                },
                readRate: {
                  type: 'number',
                  description: '확인률 (%)',
                  example: 95.0,
                },
              },
            },
          },
        },
      },
      examples: {
        detailed: {
          summary: '상세 출석 리포트',
          value: [
            {
              studentKey: '1학년1반-10',
              studentName: '홍길동',
              studentGrade: 1,
              studentClass: '1반',
              groupName: '영어 A반',
              totalClasses: 20,
              attendanceCount: 18,
              absentCount: 1,
              lateCount: 1,
              excusedCount: 0,
              attendanceRate: 90.0,
              attendances: [
                {
                  date: '2024-12-23',
                  status: 'PRESENT',
                  start: '14:00',
                  end: '14:40',
                  parentNote: '정상 출석',
                  schoolNote: '집중도 높음',
                  isRead: true,
                  updatedAt: 1703345200,
                },
                {
                  date: '2024-12-30',
                  status: 'LATE',
                  start: '14:00',
                  end: '14:40',
                  parentNote: '교통 체증으로 지각',
                  schoolNote: '5분 지각, 적극 참여',
                  isRead: false,
                  updatedAt: 1703905200,
                },
              ],
              lastUpdate: 1703905200,
              parentEngagement: {
                noteCount: 15,
                readRate: 95.0,
              },
            },
            {
              studentKey: '1학년2반-05',
              studentName: '김영희',
              studentGrade: 1,
              studentClass: '2반',
              groupName: '영어 A반',
              totalClasses: 20,
              attendanceCount: 19,
              absentCount: 0,
              lateCount: 0,
              excusedCount: 1,
              attendanceRate: 100.0,
              attendances: [
                {
                  date: '2024-12-23',
                  status: 'PRESENT',
                  start: '14:00',
                  end: '14:40',
                  parentNote: null,
                  schoolNote: '모범적 참여',
                  isRead: true,
                  updatedAt: 1703345200,
                },
                {
                  date: '2024-12-30',
                  status: 'EXCUSED_ABSENT',
                  start: '14:00',
                  end: '14:40',
                  parentNote: '독감으로 결석',
                  schoolNote: '병결 처리',
                  isRead: true,
                  updatedAt: 1703905200,
                },
              ],
              lastUpdate: 1703905200,
              parentEngagement: {
                noteCount: 8,
                readRate: 100.0,
              },
            },
          ],
        },
        summary: {
          summary: '요약 리포트',
          value: [
            {
              studentKey: '1학년1반-10',
              studentName: '홍길동',
              groupName: '영어 A반',
              totalClasses: 20,
              attendanceRate: 90.0,
              attendances: [
                {
                  date: '2024-12-30',
                  status: 'PRESENT',
                },
              ],
              parentEngagement: {
                noteCount: 15,
                readRate: 95.0,
              },
            },
          ],
        },
        noData: {
          summary: '데이터 없음',
          value: [],
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ============================================================================ ?//
//? Download Monthly Report Excel
//? ============================================================================ ?//

export const DownloadMonthlyReportExcelDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📥 월간 출석 리포트 엑셀 다운로드',
      description: `
### 📥 과목별 월간 출석 리포트 엑셀 파일 다운로드

**기능 개요:**
- 특정 과목의 특정 월 출석 데이터를 엑셀 파일로 다운로드합니다
- 학생별 출석 현황과 통계를 포함한 상세 리포트를 제공합니다

**엑셀 파일 구성:**
- 📊 **제목**: 월간 출석 리포트 (해당 월 표시)
- 📋 **학생 정보**: 이름, 학년, 반, 번호
- 📈 **출석 통계**: 전체 수업, 출석, 결석, 지각, 공결 횟수
- 📊 **출석률**: 백분율로 표시된 출석률
- 📝 **상세 기록**: 날짜별 출석 상태 및 메모
- 📊 **학부모 참여도**: 메모 작성 수, 확인률

**파일 형식:**
- **확장자**: .xlsx (Excel 2007+)
- **인코딩**: UTF-8
- **다운로드**: 브라우저에서 자동 다운로드

**사용 시나리오:**
- 📊 **출석 관리**: 월간 출석 현황 정리
- 📋 **상담 자료**: 학부모 상담 시 자료 제시
- 📈 **통계 분석**: 출석 패턴 분석 및 개선 방안 도출
- 📁 **보관**: 출석 기록 보관 및 이력 관리

**주의사항:**
- 대용량 데이터의 경우 생성 시간이 소요될 수 있습니다
- 개인정보가 포함되어 보안에 유의해야 합니다
- 파일명은 "{YYYY-MM}-lesson-report.xlsx" 형식으로 생성됩니다
      `,
    }),
    ApiParam({
      name: 'lessonId',
      type: Number,
      description: '엑셀을 다운로드할 과목의 고유 ID',
      example: 1,
    }),
    ApiParam({
      name: 'month',
      type: String,
      description: '다운로드할 월 (YYYY-MM 형식)',
      example: '2024-12',
    }),
    ApiOkResponse({
      description: '월간 출석 리포트 엑셀 다운로드 성공',
      schema: {
        type: 'string',
        format: 'binary',
        description: 'Excel 파일 (.xlsx)',
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
