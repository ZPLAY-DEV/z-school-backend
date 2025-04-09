import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from 'src/domain/post/dto/create-post.dto';
export class UpdatePostDto extends PartialType(CreatePostDto) {}
