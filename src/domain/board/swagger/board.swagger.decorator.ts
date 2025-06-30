import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { RemovalStatus } from 'src/common/enums';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiEnumResponseTemplate } from 'src/common/swagger/response/api-enum.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateBoardDto } from '../dto/create-board.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { GenerateS3UrlResponseDto } from '../dto/generate-s3url.response.dto';
import { UpdateBoardDto } from '../dto/update-board.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { Board } from '../entities/board.entity';
import { Comment } from '../entities/comment.entity';

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
      summary: '게시글 작성',
      description: `
      - 그룹 게시판에 새로운 게시글을 작성합니다.
      - 제목, 내용, 이미지를 포함할 수 있습니다.
      `,
    }),
    ApiBody({
      type: CreateBoardDto,
    }),
    ApiCreatedResponseTemplate({
      description: '게시글 작성 완료',
      type: Board,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Comment
//? ---------------------------------------------------------------------- ?//
export const CreateCommentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '댓글 작성',
      description: `
      - 특정 게시글에 댓글을 작성합니다.
      `,
    }),
    ApiParam({
      name: 'boardId',
      type: Number,
      description: '게시글 ID',
    }),
    ApiBody({
      type: CreateCommentDto,
    }),
    ApiCreatedResponseTemplate({
      description: '댓글 작성 완료',
      type: Comment,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Board
//? ---------------------------------------------------------------------- ?//
export const UpdateBoardDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '게시글 수정',
      description: `
      - 기존 게시글의 내용을 수정합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '게시글 ID',
    }),
    ApiBody({
      type: UpdateBoardDto,
    }),
    ApiOkResponseTemplate({
      description: '게시글 수정 완료',
      type: Board,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Comment
//? ---------------------------------------------------------------------- ?//
export const UpdateCommentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '댓글 수정',
      description: `
      - 기존 댓글의 내용을 수정합니다.
      `,
    }),
    ApiParam({
      name: 'commentId',
      type: Number,
      description: '댓글 ID',
    }),
    ApiBody({
      type: UpdateCommentDto,
    }),
    ApiOkResponseTemplate({
      description: '댓글 수정 완료',
      type: Comment,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? FindById
//? ---------------------------------------------------------------------- ?//
export const FindBoardByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '게시글 상세 조회',
      description: `
      - 특정 게시글의 상세 정보와 댓글 목록을 조회합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '게시글 ID',
    }),
    ApiOkResponseTemplate({
      description: '게시글 상세 조회 완료',
      type: Board,
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
