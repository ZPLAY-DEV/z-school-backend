import { PartialType } from '@nestjs/swagger';
import { CreatePresenceDto } from 'src/domain/presence/dto/create-presence.dto';

export class UpdatePresenceDto extends PartialType(CreatePresenceDto) {}
