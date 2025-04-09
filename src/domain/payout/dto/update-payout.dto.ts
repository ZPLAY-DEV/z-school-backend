import { PartialType } from '@nestjs/mapped-types';
import { CreatePayoutDto } from 'src/domain/payout/dto/create-payout.dto';

export class UpdatePayoutDto extends PartialType(CreatePayoutDto) {}
