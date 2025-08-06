import { PartialType } from '@nestjs/swagger';
import { CreateHistoryDto } from 'src/domain/history/dto/create-history.dto';
export class UpdateHistoryDto extends PartialType(CreateHistoryDto) {}
