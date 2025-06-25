import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { CreateNewsletterDto } from '../dto/create-newsletter.dto';
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
      - target: SCHOOL(전교생), GRADE(학년), LESSON(강좌), GROUP(반), OTHER(학생 아이디로 지정)
      - targetItems?:
        - target이 SCHOOL인 경우 null
        - target이 GRADE인 경우 학년 아이디 배열 number[]
        - target이 LESSON인 경우 강좌 아이디 배열 number[]
        - target이 GROUP인 경우 반 아이디 배열 number[]
        - target이 OTHER인 경우 학생 아이디 배열 number[]
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
//? Find Newsletter By ID
//? ---------------------------------------------------------------------- ?//

export const FindNewsletterByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '뉴스레터 상세 조회',
      description: `
      - 특정 ID로 뉴스레터의 상세 정보를 조회합니다.
      - 읽지 않은 부모(unreadParents) 정보도 함께 조회됩니다.
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
      type: Newsletter,
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
//? Get Unread Parents
//? ---------------------------------------------------------------------- ?//

export const GetUnreadParentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '읽지 않은 부모 목록 조회',
      description: `
      - 특정 뉴스레터를 아직 읽지 않은 부모들의 목록을 조회합니다.
      - 읽음 추적을 통해 뉴스레터 전달 현황을 파악할 수 있습니다.
      `,
    }),
    ApiParam({
      name: 'newsletterId',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiExtraModels(Parent),
    ApiOkResponse({
      description: '읽지 않은 부모 목록 조회 완료',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Parent) },
        description: '아직 해당 뉴스레터를 읽지 않은 부모들의 목록',
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Check Read Status
//? ---------------------------------------------------------------------- ?//

export const CheckReadStatusDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '읽음 상태 확인',
      description: `
      - 특정 부모가 특정 뉴스레터를 읽었는지 확인합니다.
      - 읽음 여부를 boolean 값으로 반환합니다.
      `,
    }),
    ApiParam({
      name: 'newsletterId',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'parentId',
      type: Number,
      description: '부모 ID',
      example: 1,
    }),
    ApiOkResponse({
      description: '읽음 상태 확인 완료',
      schema: {
        type: 'object',
        properties: {
          isRead: {
            type: 'boolean',
            description: '읽음 여부 (true: 읽음, false: 읽지 않음)',
            example: true,
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
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
      - 읽지 않은 부모 목록에서 해당 부모를 제거합니다.
      `,
    }),
    ApiParam({
      name: 'newsletterId',
      type: Number,
      description: '뉴스레터 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'parentId',
      type: Number,
      description: '부모 ID',
      example: 1,
    }),
    ApiOkResponse({
      description: '읽음 처리 완료',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: '뉴스레터를 읽음으로 처리했습니다.',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
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
      - schoolId, newsletterId와 mimeType을 입력받아 학교별 뉴스레터별 경로에 업로드 URL을 생성합니다.
      - 생성된 uploadUrl로 파일을 업로드한 후 imageUrl로 접근할 수 있습니다.
      `,
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          schoolId: {
            type: 'number',
            description: '학교 ID',
            example: 1,
          },
          newsletterId: {
            type: 'number',
            description: '뉴스레터 ID',
            example: 1,
          },
          mimeType: {
            type: 'string',
            description: '업로드할 파일의 MIME 타입',
            example: 'image/jpeg',
          },
        },
        required: ['schoolId', 'newsletterId', 'mimeType'],
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
              'https://afterschool-images-bucket.s3.amazonaws.com/dev/schools/1/newsletters/1/file-12345.jpg?...',
          },
          imageUrl: {
            type: 'string',
            description: '업로드 후 파일에 접근할 수 있는 CloudFront URL',
            example:
              'https://d1234567890.cloudfront.net/dev/schools/1/newsletters/1/file-12345.jpg',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};
