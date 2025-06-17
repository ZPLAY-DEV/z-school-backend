import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { RemovalStatus } from 'src/common/enums';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiEnumResponseTemplate } from 'src/common/swagger/response/api-enum.response';
import { BoardRelationResponseDto } from '../dto/board-relation-response.dto';
import { BoardResponseDto } from '../dto/board-response.dto';
import { CommentResponseDto } from '../dto/comment-response.dto';
import { CreateBoardDto } from '../dto/create-board.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { GenerateS3UrlResponseDto } from '../dto/generate-s3url.response.dto';
import { UpdateBoardDto } from '../dto/update-board.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';

//? ---------------------------------------------------------------------- ?//
//? Generate S3 Path
//? ---------------------------------------------------------------------- ?//
export const GenerateS3PathDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ S3 uploadUrl(presignedUrl) & imageUrl 반환',
      description: `
      - 게시글 작성시 첨부 이미지를 업로드 할 수 있는 Presigned URL과 upload URL을 반환
      - 해당 uploadUrl(presignedUrl)은 10분간 유효하게 사용할 수 있으며, 해당 uploadUrl로 10분 내에 요청을 보내면, 실제 경로값은 imageUrl과 동일하게 적용됨. 
      - 단, 다중 이미지 업로드에서 해당 엔드포인트를 업로드하는 이미지 만큼 요청을 해야되기 때문에, 해당 부분은 논의가 필요해보임.
      `,
    }),
    ApiBody({
      description: '이미지의 mime type',
      type: String,
      required: true,
      schema: {
        type: 'string',
        nullable: false,
        title: 'mime',
        example: 'image/png',
      },
    }),
    ApiCreatedResponseTemplate({
      description: 'S3 Presigned URL 반환 완료',
      type: GenerateS3UrlResponseDto,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Board
//? ---------------------------------------------------------------------- ?//
export const CreateBoardDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 게시글 생성 - 강사의 수업 게시판 작성',
      description: `
      - 강사가 본인이 수업하는 강좌(Group)에 대한 게시글을 작성
      - 게시글은 강사만 작성할 수 있음 -> JWT Role값이 INSTRUCTOR 아닐 경우 403
      - 게시글 작성 시 첨부 이미지를 업로드 할 수 있음
      - 게시글 작성시 이미지 첨부는 Presigned URL을 통해서 진행
      `,
    }),
    ApiBody({
      type: CreateBoardDto,
    }),
    ApiCreatedResponseTemplate({
      description: '게시글 생성 완료',
      type: BoardResponseDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.FORBIDDEN,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Comment
//? ---------------------------------------------------------------------- ?//
export const CreateCommentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 댓글 생성 - 강사의 수업 게시판 댓글 추가',
      description: `
      - 게시글에 댓글을 작성
      - name은 학생의 학년-반-번호 이름(학부모) 형식으로 지정
      `,
    }),
    ApiBody({
      type: CreateCommentDto,
    }),
    ApiCreatedResponseTemplate({
      description: '댓글 생성 완료',
      type: CommentResponseDto,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Board
//? ---------------------------------------------------------------------- ?//
export const UpdateBoardDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 게시글 수정 - 강사의 수업 게시판 정보 수정',
      description: `
      - 게시글 수정
      - userId, 게시글 id가 일치해야만 수정 가능 - 불일치 할 경우 404 반환
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '게시글 id',
      required: true,
    }),
    ApiBody({
      type: UpdateBoardDto,
    }),
    ApiCreatedResponseTemplate({
      description: '게시글 수정 완료',
      type: BoardResponseDto,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.FORBIDDEN,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Comment
//? ---------------------------------------------------------------------- ?//
export const UpdateCommentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 댓글 수정 - 강사의 수업 게시판 댓글 수정',
      description: `
      - 댓글 수정
      - userId, 댓글 id가 일치해야만 수정 가능 - 불일치 할 경우 404 반환
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '댓글 id',
      required: true,
    }),
    ApiBody({
      type: UpdateCommentDto,
    }),
    ApiCreatedResponseTemplate({
      description: '댓글 수정 완료',
      type: CommentResponseDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? FindById
//? ---------------------------------------------------------------------- ?//
export const FindByIdBoardDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 게시글 조회 - 강사의 수업 게시판 상세 조회',
      description: `
      - 게시글 상세 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '게시글 id',
      required: true,
    }),
    ApiCreatedResponseTemplate({
      description: '게시글 조회 상세 완료',
      type: BoardRelationResponseDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Board
//? ---------------------------------------------------------------------- ?//
export const DeleteBoardDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 게시글 삭제 - 강사의 수업 게시판 삭제',
      description: `
      - 게시글 삭제시 토큰의 Role이 INSTRUCTOR 경우에만 삭제 가능
      - 본인이 작성한 게시글이 아닐 경우 삭제가 불가
      - 게시글 삭제시 댓글도 함께 삭제  
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '게시글 id',
      required: true,
    }),
    ApiEnumResponseTemplate({
      description: '게시글 삭제 완료',
      type: RemovalStatus,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.FORBIDDEN),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Comment
//? ---------------------------------------------------------------------- ?//
export const DeleteCommentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 댓글 삭제 - 강사의 수업 게시판 댓글 삭제',
      description: `
      - 댓글 삭제
      - userId, 댓글 id가 일치해야만 삭제 가능 - 불일치 할 경우 404 반환
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '댓글 id',
      required: true,
    }),
    ApiEnumResponseTemplate({
      description: '댓글 삭제 완료',
      type: RemovalStatus,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
