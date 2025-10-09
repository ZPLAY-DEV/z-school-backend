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
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateNewsletterDto } from '../dto/create-newsletter.dto';
import { UpdateNewsletterDto } from '../dto/update-newsletter.dto';
import { Newsletter } from '../entities/newsletter.entity';

//? ---------------------------------------------------------------------- ?//
//? Newsletter Controller - CREATE
//? ---------------------------------------------------------------------- ?//

export const CreateNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📧 뉴스레터 생성',
      description:
        '학교의 특정 학기에 귀속된 뉴스레터를 생성합니다 (타입: REGISTRATION/NEWS/CHANGES).',
    }),
    ApiBody({
      type: CreateNewsletterDto,
      examples: {
        'registration-newsletter': {
          summary: '수강신청 안내 뉴스레터',
          description: '전교생 대상 수강신청 안내 (즉시 발송)',
          value: {
            schoolId: 1,
            termId: 1,
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            termName: '1학기',
            title: '2025년 1학기 수강신청 안내',
            body: '2025년 1학기 늘봄학교 수강신청을 시작합니다.\n\n신청 기간: 2025년 2월 1일 ~ 2월 15일\n신청 방법: 앱을 통한 온라인 신청\n\n자세한 내용은 첨부된 안내문을 확인해주세요.',
            type: 'REGISTRATION',
            status: 'INIT',
            images: ['https://s3.amazonaws.com/bucket/registration-guide.jpg'],
          },
        },
        'grade-specific-news': {
          summary: '특정 학년 공지사항',
          description: '1, 2학년 대상 공지사항',
          value: {
            schoolId: 1,
            termId: 1,
            title: '1, 2학년 현장학습 안내',
            body: '다음 주 금요일에 진행될 현장학습에 대한 안내입니다.\n\n일시: 2025년 3월 15일 금요일\n장소: 국립중앙박물관\n집합시간: 오전 9시\n\n준비물과 주의사항을 확인해주세요.',
            type: 'NEWS',
            status: 'INIT',
            images: [],
          },
        },
        'lesson-survey': {
          summary: '강좌별 만족도 조사',
          description: '특정 강좌 수강생 대상 설문조사',
          value: {
            schoolId: 1,
            termId: 1,
            title: '미술반 수업 만족도 조사',
            body: '미술반 수업에 대한 만족도 조사를 실시합니다.\n\n설문 기간: 2025년 4월 1일 ~ 4월 7일\n소요 시간: 약 5분\n\n학생들의 의견을 바탕으로 더 나은 수업을 준비하겠습니다.',
            type: 'SURVEY',
            status: 'INIT',
            images: [],
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '뉴스레터 생성 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.CONFLICT),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Newsletter Controller - READ
//? ---------------------------------------------------------------------- ?//

export const FindNewsletterByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 뉴스레터 상세 조회',
      description: '뉴스레터의 상세 정보를 조회합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 뉴스레터의 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'relations',
      type: [String],
      description: '함께 로드할 관련 엔티티 목록 (선택사항)',
      example: ['term', 'school'],
      required: false,
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 상세 조회 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Newsletter Controller - UPDATE
//? ---------------------------------------------------------------------- ?//

export const UpdateNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 뉴스레터 수정',
      description:
        '뉴스레터 정보를 부분적으로 수정합니다 (제공된 필드만 업데이트).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 뉴스레터의 ID',
      example: 1,
    }),
    ApiBody({
      type: UpdateNewsletterDto,
      examples: {
        'content-update': {
          summary: '내용 수정',
          description: '제목과 본문만 수정',
          value: {
            title: '수정된 공지사항 제목',
            body: '수정된 내용입니다.\n\n추가 정보가 포함되었습니다.',
          },
        },
        'status-change': {
          summary: '상태 변경',
          description: '뉴스레터 상태를 DRAFT에서 PUBLISHED로 변경',
          value: {
            status: 'PUBLISHED',
          },
        },
        'image-update': {
          summary: '이미지 업데이트',
          description: '첨부 이미지 목록 변경',
          value: {
            images: [
              'https://s3.amazonaws.com/bucket/new-image1.jpg',
              'https://s3.amazonaws.com/bucket/new-image2.jpg',
            ],
          },
        },
        'reschedule-dispatch': {
          summary: '발송 재예약',
          description: '기존 발송을 취소하고 새로운 시간에 재발송 예약',
          value: {
            rescheduledAt: '2025-03-15T14:00:00Z',
            target: 'GRADE',
            targetItems: [1, 2],
            targetLabel: '1, 2학년',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 수정 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

export const MarkAsReadByParentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✅ 뉴스레터 읽음 표시 (학부모 기준)',
      description:
        '학부모의 모든 자녀에 대해 뉴스레터를 읽음 처리합니다 (다자녀 가정 편의성). 💡 특정 학생만 읽음 처리는 PATCH /newsletters/:id/students/:studentId/read 사용.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiParam({
      name: 'parentId',
      type: Number,
      description: '학부모 ID',
      example: 5,
    }),
    ApiOkResponse({
      description: '읽음 표시 완료',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const MarkAsReadByStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✅ 뉴스레터 읽음 표시 (학생 기준)',
      description:
        '특정 학생에 대해서만 뉴스레터를 읽음 처리합니다 (정확한 개별 처리). 💡 모든 자녀 일괄 읽음 처리는 PATCH /newsletters/:id/parents/:parentId/read 사용.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 10,
    }),
    ApiOkResponse({
      description: '읽음 표시 완료',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Newsletter Controller - DELETE
//? ---------------------------------------------------------------------- ?//

export const DeleteNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 뉴스레터 삭제',
      description:
        '뉴스레터를 소프트 삭제합니다 (Notifiable과 Recipient도 함께 삭제).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 뉴스레터의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 삭제 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Newsletter Controller - EXTRAS
//? ---------------------------------------------------------------------- ?//

export const GenerateNewsletterS3UrlsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📎 뉴스레터 첨부파일 업로드 URL 생성',
      description:
        '뉴스레터 첨부 파일의 S3 Pre-signed 업로드 URL을 생성합니다 (10분 유효).',
    }),
    ApiBody({
      description: 'S3 업로드 URL 생성을 위한 요청 정보',
      schema: {
        type: 'object',
        required: ['schoolId', 'termId', 'mimeType'],
        properties: {
          schoolId: {
            type: 'number',
            description: '학교 ID',
            example: 1,
          },
          termId: {
            type: 'number',
            description: '학기 ID',
            example: 1,
          },
          mimeType: {
            type: 'string',
            description: '파일의 MIME 타입',
            enum: [
              'image/jpeg',
              'image/jpg',
              'image/png',
              'image/gif',
              'image/webp',
              'application/pdf',
            ],
            example: 'image/jpeg',
          },
          filename: {
            type: 'string',
            description: '파일명 (선택사항, 미제공 시 자동 생성)',
            example: 'newsletter-attachment.jpg',
          },
        },
      },
      examples: {
        'jpeg-image': {
          summary: 'JPEG 이미지 업로드',
          description: 'JPEG 형식의 이미지 파일 업로드 URL 생성',
          value: {
            schoolId: 1,
            termId: 1,
            mimeType: 'image/jpeg',
          },
        },
        'png-image-with-filename': {
          summary: 'PNG 이미지 업로드 (파일명 지정)',
          description: 'PNG 형식의 이미지 파일을 지정된 파일명으로 업로드',
          value: {
            schoolId: 1,
            termId: 1,
            mimeType: 'image/png',
            filename: 'newsletter-banner.png',
          },
        },
        'webp-image': {
          summary: 'WebP 이미지 업로드',
          description: '고효율 WebP 형식의 이미지 파일 업로드',
          value: {
            schoolId: 2,
            termId: 3,
            mimeType: 'image/webp',
          },
        },
        'gif-animation': {
          summary: 'GIF 애니메이션 업로드',
          description: 'GIF 애니메이션 파일 업로드 (이벤트 공지용)',
          value: {
            schoolId: 1,
            termId: 1,
            mimeType: 'image/gif',
            filename: 'event-animation.gif',
          },
        },
        'pdf-document': {
          summary: 'PDF 문서 업로드',
          description: 'PDF 형식의 문서 파일 업로드 (가정통신문, 안내서 등)',
          value: {
            schoolId: 1,
            termId: 1,
            mimeType: 'application/pdf',
            filename: 'parent-notice.pdf',
          },
        },
        'different-school-term': {
          summary: '다른 학교/학기 업로드',
          description: '다른 학교의 다른 학기에 파일 업로드',
          value: {
            schoolId: 3,
            termId: 2,
            mimeType: 'image/jpeg',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'S3 업로드 URL 생성 완료',
      schema: {
        type: 'object',
        properties: {
          uploadUrl: {
            type: 'string',
            description: '파일 업로드용 Pre-signed URL (10분 만료)',
            example:
              'https://s3.amazonaws.com/afterschool-files-bucket/dev/schools/1/terms/1/newsletters/1703123456789-abc123.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...',
          },
          fileUrl: {
            type: 'string',
            description: '업로드 완료 후 접근 가능한 파일 URL (CloudFront CDN)',
            example:
              'https://cdn.example.com/afterschool-files-bucket/dev/schools/1/terms/1/newsletters/1703123456789-abc123.jpg',
          },
        },
        required: ['uploadUrl', 'fileUrl'],
      },
      examples: {
        'successful-response': {
          summary: '성공적인 URL 생성',
          value: {
            uploadUrl:
              'https://s3.amazonaws.com/afterschool-files-bucket/dev/schools/1/terms/1/newsletters/1703123456789-abc123.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20231221%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20231221T120000Z&X-Amz-Expires=600&X-Amz-SignedHeaders=host&X-Amz-Signature=...',
            fileUrl:
              'https://cdn.example.com/afterschool-files-bucket/dev/schools/1/terms/1/newsletters/1703123456789-abc123.jpg',
          },
        },
        'with-custom-filename': {
          summary: '사용자 지정 파일명으로 생성',
          value: {
            uploadUrl:
              'https://s3.amazonaws.com/afterschool-files-bucket/dev/schools/1/terms/1/newsletters/newsletter-banner.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...',
            fileUrl:
              'https://cdn.example.com/afterschool-files-bucket/dev/schools/1/terms/1/newsletters/newsletter-banner.png',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.INTERNAL_SERVER_ERROR),
  );
};
