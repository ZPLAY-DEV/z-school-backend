import { PartialType } from '@nestjs/swagger';
import { CreateOfferingDto } from 'src/domain/term/dto/create-term.dto';
export class UpdateOfferingDto extends PartialType(CreateOfferingDto) {}
