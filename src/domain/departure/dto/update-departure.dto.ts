import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartureDto } from 'src/domain/departure/dto/create-departure.dto';

export class UpdateDepartureDto extends PartialType(CreateDepartureDto) {}
