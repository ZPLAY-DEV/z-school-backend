import { PartialType } from '@nestjs/swagger';
import { CreateScoreDto } from 'src/domain/score/dto/create-score.dto';

export class UpdateScoreDto extends PartialType(CreateScoreDto) {}

