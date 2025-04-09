import { PartialType } from '@nestjs/swagger';
import { CreateProviderDto } from 'src/domain/user/dto/create-provider.dto';
export class UpdateProviderDto extends PartialType(CreateProviderDto) {}
