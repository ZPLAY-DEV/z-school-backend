import { BadRequestException, Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator';
import * as firebaseAdmin from 'firebase-admin';
import {
  TokenMessage,
  TopicMessage,
} from 'firebase-admin/lib/messaging/messaging-api';

import { IData } from 'src/common/interfaces';

//? reference) https://blog.logrocket.com/implement-in-app-notifications-nestjs-mysql-firebase/
@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  async sendToToken(message: TokenMessage): Promise<string> {
    try {
      return await firebaseAdmin.messaging().send(message);
    } catch (error) {
      this.logger.error(error.message, error.stackTrace, '@sendToToken');
      throw error;
    }
  }

  async sendToTopic(message: TopicMessage): Promise<string> {
    try {
      return await firebaseAdmin.messaging().send(message);
    } catch (error) {
      this.logger.error(error.message, error.stackTrace, '@sendToTopic');
      throw error;
    }
  }

  // todo. refactor this later
  async sendToCondition(
    condition: string,
    notification: firebaseAdmin.messaging.Notification,
    data: IData,
  ): Promise<string> {
    const payload: firebaseAdmin.messaging.ConditionMessage = {
      condition,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: {
        page: data.page,
        args: data.args,
      },
      apns: {
        fcmOptions: {
          imageUrl: notification?.imageUrl,
        },
      },
      android: {
        priority: 'high',
        ttl: 60 * 60 * 24,
      },
    };
    try {
      return await firebaseAdmin.messaging().send(payload);
    } catch (error) {
      this.logger.error(error.message, error.stackTrace, '@sendToCondition');
      throw error;
    }
  }

  // todo. refactor this later
  async sendMulticast(
    tokens: string[],
    notification: firebaseAdmin.messaging.Notification,
    data: IData,
  ) {
    if (tokens.length < 1) {
      throw new BadRequestException('No token is provided.');
    }

    const payload: firebaseAdmin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification?.title,
        body: notification?.body,
        imageUrl: notification?.imageUrl,
      },
      data: {
        page: data.page,
        args: data.args,
      },
      apns: {
        fcmOptions: {
          imageUrl: notification?.imageUrl,
        },
      },
      android: {
        priority: 'high',
        ttl: 60 * 60 * 24,
      },
    };

    let result: firebaseAdmin.messaging.BatchResponse | null = null;
    let failureCount = 0;
    let successCount = 0;
    const sendingTokens = [...tokens];

    while (sendingTokens.length > 0) {
      try {
        result = await firebaseAdmin.messaging().sendEachForMulticast({
          ...payload,
          tokens: sendingTokens.splice(0, 500),
        });
        failureCount += result?.failureCount || 0;
        successCount += result?.successCount || 0;
      } catch (error) {
        this.logger.error(error.message, error.stackTrace, 'sendMulticast');
        throw error;
      }
    }
    this.logger.log(`success: ${successCount}, failure: ${failureCount}`);
    return { failureCount, successCount };
  }
}
