import { ApiProperty } from '@nestjs/swagger';
import { BoardResponseDto } from './board-response.dto';
import { CommentResponseDto } from './comment-response.dto';

export class BoardRelationResponseDto extends BoardResponseDto {
  @ApiProperty({
    description: '댓글 목록',
    type: CommentResponseDto,
    isArray: true,
  })
  comments: CommentResponseDto[];
}
