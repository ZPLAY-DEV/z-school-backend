import { ApiProperty } from '@nestjs/swagger';

export class BoardResponseDto {
  @ApiProperty({
    description: '게시글 ID',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: '유저 ID',
    type: Number,
  })
  userId: number;

  @ApiProperty({
    description: '그룹 ID',
    type: Number,
  })
  groupId: number;

  @ApiProperty({
    description: '학교 ID',
    type: Number,
  })
  schoolId: number;

  @ApiProperty({
    description: '게시글 제목',
    type: String,
  })
  title: string;

  @ApiProperty({
    description: '게시글 내용',
    type: String,
  })
  body: string | null;

  @ApiProperty({
    description: '게시글 이미지',
    type: [String],
  })
  images: string[] | null;

  @ApiProperty({
    description: '게시글 생성일',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: '게시글 수정일',
    type: Date,
  })
  updatedAt: Date;
}
