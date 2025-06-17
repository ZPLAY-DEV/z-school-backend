import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { CreateTermDto } from '../dto/create-term.dto';
import { UpdateTermDto } from '../dto/update-term.dto';
import { Term } from '../entities/term.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Term
//? ---------------------------------------------------------------------- ?//

export const CreateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학기 생성',
      description: `
      - 학교에 귀속된 늘봄 학기를 생성.
      - 날짜 형식은 YYYY-MM-DD 형식으로 입력.
      - 기간 시작일이 종료일 보다 앞서야 함 -> 시작일보다 종료일이 앞설 경우 400 Validation Error 발생.
      - 수강신청 시작일과 종료일은 학기 시작 전에 있어야 함. (!)
      `,
    }),
    ApiBody({
      type: CreateTermDto,
    }),
    ApiCreatedResponseTemplate({
      description: '학기 등록 완료',
      type: Term,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Term
//? ---------------------------------------------------------------------- ?//

export const FindTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학기 상세 조회',
      description: `
      - 학기 상세 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학기 ID',
    }),
    ApiExtraModels(Term, Lesson),
    ApiOkResponse({
      description: '학기 상세 조회 완료 (lessons, offerings 관계 포함)',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Term) },
          {
            properties: {
              lessons: {
                type: 'array',
                items: { $ref: getSchemaPath(Lesson) },
                description: '연결된 수업 목록 포함됨',
              },
            },
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Term
//? ---------------------------------------------------------------------- ?//

export const UpdateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학기 정보 수정',
      description: `
      - 학교에 귀속된 늘봄 학기 수정
      - bookingStart 속성값을 최초 입력시, 수강신청과목 (offerings) 테이블이 생성되고, isOfferingReady 가 true 로 변경됨.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학기 ID',
    }),
    ApiBody({
      type: UpdateTermDto,
      examples: {
        example1: {
          value: {
            termName: '2025-2학기',
            bookingStart: '2025-08-20T00:00:00Z',
            bookingEnd: '2025-08-25T23:59:59Z',
          },
        },
      },
    }),
    ApiExtraModels(Term),
    ApiOkResponseTemplate({
      description: '학기 수정 완료',
      type: Term,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Term
//? ---------------------------------------------------------------------- ?//

export const DeleteTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학기 삭제',
      description: `
      - 학기 삭제 (소프트 삭제)
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학기 ID',
    }),
    ApiOkResponseTemplate({
      description: '학기 삭제 완료',
      type: Term,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Generate S3 URLs
//? ---------------------------------------------------------------------- ?//

export const GenerateS3UrlsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '이미지 업로드 URL 생성',
      description: `
      - S3 업로드를 위한 Presigned URL과 이미지 접근 URL을 생성합니다.
      - schoolId와 mimeType을 입력받아 학교별 연도별 경로에 업로드 URL을 생성합니다.
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
          mimeType: {
            type: 'string',
            description: '업로드할 파일의 MIME 타입',
            example: 'image/jpeg',
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
            description: '파일 업로드를 위한 Presigned URL',
            example:
              'https://afterschool-images-bucket.s3.amazonaws.com/dev/school-1/2024/file-12345.jpg?...',
          },
          imageUrl: {
            type: 'string',
            description: '업로드 후 파일에 접근할 수 있는 CloudFront URL',
            example:
              'https://d1234567890.cloudfront.net/dev/school-1/2024/file-12345.jpg',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete File
//? ---------------------------------------------------------------------- ?//

export const DeleteFileDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '파일 삭제',
      description: `
      - S3에 업로드된 파일을 삭제합니다.
      - 파일의 URL을 입력받아 해당 파일을 S3에서 삭제합니다.
      `,
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '삭제할 파일의 URL',
            example:
              'https://d1234567890.cloudfront.net/dev/school-1/2024/file-12345.jpg',
          },
        },
        required: ['url'],
      },
    }),
    ApiOkResponse({
      description: '파일 삭제 완료',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '파일이 성공적으로 삭제되었습니다.',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};
