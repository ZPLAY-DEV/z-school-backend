import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
