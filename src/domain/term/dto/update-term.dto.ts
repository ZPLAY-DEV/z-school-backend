import { PartialType } from '@nestjs/swagger';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
export class UpdateTermDto extends PartialType(CreateTermDto) {}
