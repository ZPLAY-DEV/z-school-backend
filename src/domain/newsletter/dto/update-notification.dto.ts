import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationDto } from 'src/domain/newsletter/dto/create-notification.dto';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
