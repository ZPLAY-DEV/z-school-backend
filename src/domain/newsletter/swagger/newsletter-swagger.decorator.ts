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
import { GenerateS3UrlsDto } from '../dto/generate-s3-urls.dto';
import { ResendNewsletterDto } from '../dto/resend-newsletter.dto';
import { NewsletterDetailResponseDto } from '../dto/response-extended-newsletter.dto';
import { UpdateNewsletterDto } from '../dto/update-newsletter.dto';
import { Newsletter } from '../entities/newsletter.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Newsletter
//? ---------------------------------------------------------------------- ?//

export const CreateNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 생성',
      description: `
      - 학교의 학기에 귀속된 뉴스레터를 생성합니다.
      - 뉴스레터 종류: REGISTRATION(수강신청), NEWS(공지사항), SURVEY(설문지)
      - scheduledAt을 생성시 지정하거나 수정해서 입력하면 발송예약됩니다.
      - 예약하더라도 최대 5분의 지연이 있습니다.
      - 즉시 발송도 scheduledAt을 현재 시간으로 설정한 발송예약처럼 동작합니다.
      - target: SCHOOL(전교생), GRADE(학년), LESSON(강좌), GROUP(반), STUDENT(학생 아이디로 지정)
      - targetItems?:
        - target이 SCHOOL인 경우 null
        - target이 GRADE인 경우 학년 아이디 배열 number[]
        - target이 LESSON인 경우 강좌 아이디 배열 number[]
        - target이 GROUP인 경우 반 아이디 배열 number[]
        - target이 STUDENT인 경우 학생 아이디 배열 number[]
      - targetLabel?: 발송대상을 사람이 읽기 좋게 설명한 글 string|null
      - images: 뉴스레터 첨부 이미지 배열
      `,
    }),
    ApiBody({
      type: CreateNewsletterDto,
      examples: {
        example1: {
          summary: '공지사항 생성 예제',
          value: {
            schoolId: 1,
            termId: 1,
            title: '2025년 1학기 수강신청 안내',
            body: '2025년 1학기 늘봄학교 수강신청을 시작합니다...',
            type: 'REGISTRATION',
            target: 'GRADE',
            targetItems: [1, 2],
            targetLabel: '1, 2학년',
            images: [],
            scheduledAt: null,
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '뉴스레터 생성 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Newsletters
//? ---------------------------------------------------------------------- ?//

export const FindNewslettersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 목록 조회',
      description: `
      - 특정 학교와 학기의 뉴스레터 목록을 조회합니다.
      - schoolId와 termId를 필수로 입력받습니다.
      - type 파라미터는 선택사항으로, 특정 타입의 뉴스레터만 필터링할 수 있습니다.
      - 결과는 ID 내림차순으로 정렬됩니다.
      `,
    }),
    ApiQuery({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'type',
      enum: ['REGISTRATION', 'NEWS', 'SURVEY'],
      description: '뉴스레터 타입 (선택사항)',
      required: false,
      example: 'REGISTRATION',
    }),
    ApiOkResponse({
      description: '뉴스레터 목록 조회 완료',
      type: Newsletter,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Registration Newsletter
//? ---------------------------------------------------------------------- ?//

export const FindRegistrationNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청 뉴스레터 조회',
      description: `
      - 특정 학교와 학기의 수강신청 타입 뉴스레터를 조회합니다.
      - schoolId와 termId를 필수로 입력받습니다.
      - 해당 학교와 학기에 등록된 수강신청 뉴스레터가 반환됩니다.
      `,
    }),
    ApiQuery({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '수강신청 뉴스레터 조회 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Newsletter By ID
//? ---------------------------------------------------------------------- ?//

export const FindNewsletterByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 상세 조회',
      description: `
      - 특정 ID로 뉴스레터의 상세 정보를 조회합니다.
      - 뉴스레터 기본 정보와 함께 관련 학생 정보도 조회됩니다.
      - 수강신청 타입의 경우 학생 목록과 총 학생 수가 포함됩니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 상세 조회 완료',
      type: NewsletterDetailResponseDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Newsletter
//? ---------------------------------------------------------------------- ?//

export const UpdateNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 수정',
      description: `
      - 기존 뉴스레터의 정보를 수정합니다.
      - 제목, 본문, 이미지, 발송 시간 등을 수정할 수 있습니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiBody({
      type: UpdateNewsletterDto,
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 수정 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Cancel Newsletter
//? ---------------------------------------------------------------------- ?//

export const CancelNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 발송 취소',
      description: `
      - 예약된 뉴스레터의 발송을 취소합니다.
      - 뉴스레터 상태가 CANCELED로 변경됩니다.
      - DynamoDB에서 해당 이벤트도 삭제됩니다.
      - 재발송 기능이 있기 때문에 shortlinks는 삭제하지 않습니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 발송 취소 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Resend Newsletter
//? ---------------------------------------------------------------------- ?//

export const ResendNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 재발송',
      description: `
      - 취소되었거나 실패한 뉴스레터를 다시 발송 예약합니다.
      - 새로운 발송 시간을 지정해야 합니다.
      - 뉴스레터 상태가 SCHEDULED로 변경됩니다.
      - 기존 학생 목록과 shortlinks를 사용하여 새로운 이벤트를 생성합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiBody({
      type: ResendNewsletterDto,
      examples: {
        example1: {
          summary: '뉴스레터 재발송 예제',
          value: {
            scheduledAt: '2025-06-05T00:30:00Z',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 재발송 예약 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Mark As Read
//? ---------------------------------------------------------------------- ?//

export const MarkAsReadDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 읽음 처리',
      description: `
      - 특정 부모가 특정 뉴스레터를 읽음으로 처리합니다.
      - 해당하는 shortlink의 isRead 플래그를 true로 변경합니다.
      - 뉴스레터 상세 조회 시 읽음 상태에 반영됩니다.
      `,
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
      description: '부모 ID',
      example: 1,
    }),
    ApiOkResponse({
      description: '읽음 처리 완료',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Newsletter
//? ---------------------------------------------------------------------- ?//

export const DeleteNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 삭제',
      description: `
      - 뉴스레터를 소프트 삭제합니다.
      - 실제로는 deletedAt 필드가 설정되어 논리적으로 삭제됩니다.
      - 관련된 shortlinks와 이벤트는 그대로 유지됩니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '뉴스레터 ID',
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
//? Generate S3 URLs
//? ---------------------------------------------------------------------- ?//

export const GenerateNewsletterS3UrlsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 이미지 업로드 URL 생성',
      description: `
      - 뉴스레터 첨부 이미지 업로드를 위한 S3 Presigned URL과 이미지 접근 URL을 생성합니다.
      - schoolId, termId와 mimeType을 입력받아 학교별 학기별 경로에 업로드 URL을 생성합니다.
      - 생성된 uploadUrl로 파일을 업로드한 후 imageUrl로 접근할 수 있습니다.
      `,
    }),
    ApiBody({
      type: GenerateS3UrlsDto,
      examples: {
        example1: {
          summary: 'JPEG 이미지 업로드 URL 생성',
          value: {
            schoolId: 1,
            termId: 1,
            mimeType: 'image/jpeg',
          },
        },
        example2: {
          summary: 'PNG 이미지 업로드 URL 생성',
          value: {
            schoolId: 1,
            termId: 1,
            mimeType: 'image/png',
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
            description: '파일 업로드를 위한 Presigned URL',
            example:
              'https://afterschool-images-bucket.s3.amazonaws.com/dev/schools/1/terms/1/newsletters/file-12345.jpg?...',
          },
          imageUrl: {
            type: 'string',
            description: '업로드 후 파일에 접근할 수 있는 CloudFront URL',
            example:
              'https://d1234567890.cloudfront.net/dev/schools/1/terms/1/newsletters/file-12345.jpg',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};
