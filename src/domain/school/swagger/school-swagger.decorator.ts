import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { Region } from 'src/common/enums';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';
import { School } from '../entities/school.entity';

export const CreateSchoolDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫 학교 생성',
      description: `
**📝 기능 설명**
새로운 학교를 시스템에 등록합니다.

**🔄 비즈니스 로직**
- 학교 기본 정보(이름, 주소, 연락처 등)를 입력받아 생성
- 지역별 학교 분류를 통한 효율적인 관리
- NEIS 연동을 위한 학교 코드 설정
- 학교 설정 기본값 자동 적용

**⚠️ 중요 제약사항**
- 학교명은 중복될 수 없음
- 필수 항목(이름, 지역, 주소)은 반드시 입력
- 유효한 지역 코드만 사용 가능
- 연락처는 표준 형식에 맞아야 함

**📚 예시 시나리오**
1. **신규 학교 시스템 도입**: 새로운 학교가 시스템을 도입할 때
2. **분교 개설**: 기존 학교의 분교나 캠퍼스 추가
3. **테스트 환경 구축**: 개발/테스트용 학교 데이터 생성

**API 호출 예시**
\`\`\`
POST /v1/schools
Content-Type: application/json

{
  "schoolName": "서울초등학교",
  "region": "SEOUL",
  "address": "서울시 강남구 테헤란로 123",
  "phone": "02-1234-5678",
  "neisCode": "B100000001"
}
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "id": 123,
  "schoolName": "서울초등학교",
  "region": "SEOUL",
  "address": "서울시 강남구 테헤란로 123",
  "phone": "02-1234-5678",
  "neisCode": "B100000001",
  "createdAt": "2024-01-15T09:00:00Z"
}
\`\`\`

**실패 응답 예시**
\`\`\`json
{
  "statusCode": 400,
  "message": "이미 존재하는 학교명입니다",
  "error": "Bad Request"
}
\`\`\`
      `,
    }),
    ApiBody({ type: CreateSchoolDto }),
    ApiCreatedResponseTemplate({ description: '학교 생성 완료', type: School }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

export const ListSchoolsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫 학교 목록 조회',
      description: `
**📝 기능 설명**
등록된 학교들의 목록을 조회합니다.

**🔄 비즈니스 로직**
- 전체 학교 목록을 지역별로 필터링하여 조회
- 지역 파라미터가 없으면 전국 모든 학교 조회
- 활성화된 학교만 목록에 포함
- 학교명 기준으로 정렬하여 제공

**⚠️ 중요 제약사항**
- 유효한 지역 코드만 필터링 가능
- 삭제된 학교는 목록에서 제외
- 조회 전용 API

**📚 예시 시나리오**
1. **관리자 대시보드**: 전체 학교 현황 파악
2. **지역별 학교 검색**: 특정 지역의 학교만 조회
3. **학교 선택 드롭다운**: 사용자가 학교를 선택할 때

**API 호출 예시**
\`\`\`
GET /v1/schools
GET /v1/schools?region=SEOUL
\`\`\`

**성공 응답 예시**
\`\`\`json
[
  {
    "id": 123,
    "schoolName": "서울초등학교",
    "region": "SEOUL",
    "address": "서울시 강남구 테헤란로 123"
  },
  {
    "id": 124,
    "schoolName": "부산중학교", 
    "region": "BUSAN",
    "address": "부산시 해운대구 해운대로 456"
  }
]
\`\`\`
      `,
    }),
    ApiQuery({
      name: 'region',
      enum: Region,
      required: false,
      description: '지역 필터 (선택사항)',
    }),
    ApiOkResponse({ description: '학교 목록 조회 완료', type: [School] }),
  );

export const PaginatedSchoolsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫📄 학교 페이지네이션 목록',
      description: `
**📝 기능 설명**
학교 목록을 페이지 단위로 조회합니다.

**🔄 비즈니스 로직**
- 대량의 학교 데이터를 페이지 단위로 분할 조회
- 검색, 정렬, 필터링 기능 제공
- 페이지 크기 및 페이지 번호 지정 가능

**⚠️ 중요 제약사항**
- 페이지 크기는 최대 100개로 제한
- 페이지 번호는 1부터 시작

**📚 예시 시나리오**
1. **학교 관리 화면**: 관리자가 학교를 페이지별로 관리
2. **대용량 데이터 처리**: 많은 학교가 등록된 경우

**API 호출 예시**
\`\`\`
GET /v1/schools/paginated?page=1&limit=20
\`\`\`
      `,
    }),
    ApiOkResponse({ description: '페이지네이션된 학교 목록 조회 완료' }),
  );

export const FindSchoolDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫🔍 학교 상세 조회',
      description: `
**📝 기능 설명**
특정 학교의 상세 정보를 조회합니다.

**🔄 비즈니스 로직**
- 학교 ID를 통한 개별 학교 정보 조회
- 학교의 모든 상세 정보 포함
- 연관된 학기 수, 학생 수 등 통계 정보 제공

**⚠️ 중요 제약사항**
- 유효한 학교 ID 필요
- 삭제된 학교는 조회 불가

**📚 예시 시나리오**
1. **학교 정보 확인**: 특정 학교의 상세 정보 조회
2. **학교 수정 전 조회**: 수정하기 전 현재 정보 확인

**API 호출 예시**
\`\`\`
GET /v1/schools/123
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "id": 123,
  "schoolName": "서울초등학교",
  "region": "SEOUL",
  "address": "서울시 강남구 테헤란로 123",
  "phone": "02-1234-5678",
  "totalTerms": 5,
  "totalStudents": 450,
  "createdAt": "2024-01-15T09:00:00Z"
}
\`\`\`

**실패 응답 예시**
\`\`\`json
{
  "statusCode": 404,
  "message": "해당 ID의 학교를 찾을 수 없습니다",
  "error": "Not Found"
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({ description: '학교 상세 조회 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const UpdateSchoolDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫✏️ 학교 정보 수정',
      description: `
**📝 기능 설명**
기존 학교의 정보를 수정합니다.

**🔄 비즈니스 로직**
- 학교 기본 정보 업데이트
- 부분 수정 지원 (변경할 필드만 전송)
- 수정 이력 자동 기록

**⚠️ 중요 제약사항**
- 유효한 학교 ID 필요
- 학교명 중복 불가
- 관리자 권한 필요

**📚 예시 시나리오**
1. **연락처 변경**: 학교 전화번호나 주소 변경
2. **학교명 수정**: 학교 이름 변경
3. **지역 이전**: 학교 위치 변경

**API 호출 예시**
\`\`\`
PATCH /v1/schools/123
Content-Type: application/json

{
  "phone": "02-9876-5432",
  "address": "서울시 강남구 새주소 789"
}
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "id": 123,
  "schoolName": "서울초등학교",
  "phone": "02-9876-5432",
  "address": "서울시 강남구 새주소 789",
  "updatedAt": "2024-01-15T10:30:00Z"
}
\`\`\`

**실패 응답 예시**
\`\`\`json
{
  "statusCode": 404,
  "message": "해당 ID의 학교를 찾을 수 없습니다",
  "error": "Not Found"
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiBody({ type: UpdateSchoolDto }),
    ApiOkResponseTemplate({ description: '학교 수정 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const DeleteSchoolDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🏫🗑️ 학교 삭제',
      description: `
**📝 기능 설명**
학교를 시스템에서 삭제합니다.

**🔄 비즈니스 로직**
- 소프트 삭제 방식으로 데이터 보존
- 연관된 학기, 학생 데이터는 별도 처리 필요
- 삭제 이력 자동 기록

**⚠️ 중요 제약사항**
- 유효한 학교 ID 필요
- 활성 학기가 있는 경우 삭제 제한
- 관리자 권한 필요
- 복구 불가능한 작업

**📚 예시 시나리오**
1. **학교 폐교**: 학교가 폐교되어 시스템에서 제거
2. **테스트 데이터 정리**: 개발/테스트용 학교 데이터 삭제
3. **잘못 생성된 학교 삭제**: 실수로 생성된 학교 제거

**API 호출 예시**
\`\`\`
DELETE /v1/schools/123
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "id": 123,
  "schoolName": "서울초등학교",
  "deletedAt": "2024-01-15T11:00:00Z",
  "message": "학교가 성공적으로 삭제되었습니다"
}
\`\`\`

**실패 응답 예시**
\`\`\`json
{
  "statusCode": 404,
  "message": "해당 ID의 학교를 찾을 수 없습니다",
  "error": "Not Found"
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({ description: '학교 삭제 완료', type: School }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const GenerateS3UrlsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📷 학교 프로모션 이미지 업로드 URL 생성',
      description: `
**📝 기능 설명**
학교 프로모션 이미지 업로드를 위한 S3 Presigned URL을 생성합니다.

**🔄 비즈니스 로직**
- AWS S3에 직접 업로드할 수 있는 임시 URL 생성
- 파일 타입 및 크기 제한 적용
- 보안된 업로드 경로 제공
- 업로드 완료 후 자동으로 학교 정보에 이미지 URL 연결

**⚠️ 중요 제약사항**
- 유효한 학교 ID 필요
- 지원되는 이미지 포맷만 허용 (JPEG, PNG, WEBP)
- 파일 크기 제한 (최대 5MB)
- 생성된 URL은 15분간만 유효

**📚 예시 시나리오**
1. **학교 홍보 이미지 업로드**: 학교 소개 페이지용 이미지 등록
2. **프로필 이미지 변경**: 기존 학교 이미지 교체
3. **이벤트 포스터 업로드**: 학교 행사 관련 이미지 업로드

**API 호출 예시**
\`\`\`
POST /v1/schools/s3-urls
Content-Type: application/json

{
  "schoolId": 123,
  "mimeType": "image/jpeg"
}
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/schools/123/promo/uuid.jpg?AWSAccessKeyId=...",
  "fileKey": "schools/123/promo/uuid.jpg",
  "expiresIn": 900,
  "maxFileSize": 5242880,
  "message": "업로드 URL이 성공적으로 생성되었습니다"
}
\`\`\`

**실패 응답 예시**
\`\`\`json
{
  "statusCode": 400,
  "message": "지원되지 않는 파일 형식입니다",
  "error": "Bad Request"
}
\`\`\`
      `,
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          schoolId: {
            type: 'number',
            example: 123,
            description: '학교 ID',
          },
          mimeType: {
            type: 'string',
            example: 'image/jpeg',
            description: '업로드할 파일의 MIME 타입',
          },
        },
        required: ['schoolId', 'mimeType'],
      },
    }),
    ApiOkResponse({
      description: 'S3 업로드 URL 생성 완료',
      schema: {
        type: 'object',
        properties: {
          uploadUrl: {
            type: 'string',
            description: 'S3 Presigned 업로드 URL',
          },
          fileKey: {
            type: 'string',
            description: 'S3 파일 키',
          },
          expiresIn: {
            type: 'number',
            description: 'URL 만료 시간 (초)',
          },
          maxFileSize: {
            type: 'number',
            description: '최대 파일 크기 (바이트)',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
