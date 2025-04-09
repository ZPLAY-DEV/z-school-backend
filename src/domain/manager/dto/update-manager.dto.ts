import { PartialType } from '@nestjs/swagger';
import { CreateManagerDto } from 'src/domain/manager/dto/create-manager.dto';
export class UpdateManagerDto extends PartialType(CreateManagerDto) {}
