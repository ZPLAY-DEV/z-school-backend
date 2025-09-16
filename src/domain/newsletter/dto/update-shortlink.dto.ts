import { PartialType } from '@nestjs/mapped-types';
import { CreateShortlinkDto } from 'src/domain/newsletter/dto/create-shortlink.dto';

export class UpdateShortlinkDto extends PartialType(CreateShortlinkDto) {}
