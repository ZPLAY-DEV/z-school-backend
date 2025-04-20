import { PartialType } from '@nestjs/swagger';
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
export class UpdateOfferingDto extends PartialType(CreateOfferingDto) {}
