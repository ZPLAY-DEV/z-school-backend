import { PartialType } from '@nestjs/mapped-types';
import { CreateContractDto } from 'src/domain/contract/dto/create-contract.dto';

export class UpdateContractDto extends PartialType(CreateContractDto) {}
