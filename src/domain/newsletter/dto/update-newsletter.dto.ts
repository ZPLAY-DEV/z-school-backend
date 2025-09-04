import { PartialType } from '@nestjs/swagger';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';

export class UpdateNewsletterDto extends PartialType(CreateNewsletterDto) {}
