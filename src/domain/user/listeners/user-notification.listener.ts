import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TokenMessage } from 'firebase-admin/lib/messaging/messaging-api';
import { UserNotificationEvent } from 'src/domain/user/events/user-notification.event';
import { FcmService } from 'src/services/fcm/fcm.service';

@Injectable()
export class UserNotificationListener {
  private readonly logger = new Logger(UserNotificationListener.name);
  constructor(private readonly fcmService: FcmService) {}

  @OnEvent('user.notified', { async: true })
  async handleOrderCreatedEvent(event: UserNotificationEvent): Promise<void> {
    if (event.token) {
      const payload: TokenMessage = {
        token: event.token,
        data: event.data,
        notification: {
          title: event.title,
          body: event.body,
        },
      };

      console.log(`✅ payload`, payload);

      try {
        await this.fcmService.sendToToken(payload);
      } catch (e) {
        // todo. slack or sentry report
        this.logger.error(e);
      }
    }
  }
}
