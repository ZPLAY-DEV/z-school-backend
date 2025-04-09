import { PartialType } from '@nestjs/mapped-types';
import { CreateCommentDto } from 'src/domain/post/dto/create-comment.dto';

export class UpdateCommentDto extends PartialType(CreateCommentDto) {}
