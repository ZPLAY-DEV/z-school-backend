import { PartialType } from '@nestjs/swagger';
import { CreateLedgerDto } from 'src/domain/ledger/dto/create-ledger.dto';

export class UpdateLedgerDto extends PartialType(CreateLedgerDto) {}
