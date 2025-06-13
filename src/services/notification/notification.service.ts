import { Injectable, Logger } from '@nestjs/common';
import { formatInTimeZone } from 'date-fns-tz';
import { MessageType } from 'src/common/enums/message-type';
import { School } from 'src/domain/school/entities/school.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { AligoService } from 'src/services/aligo/aligo-service';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { FcmService } from 'src/services/fcm/fcm.service';
import {
  MultiFcmMessages,
  MultiMixedMessages,
  MultiSmsMessages,
  NotificationResult,
} from 'src/services/notification/types';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly schoolRepository: Repository<School>;
  private readonly userRepository: Repository<User>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly fcmService: FcmService,
    private readonly aligoService: AligoService,
    private readonly firehoseService: FirehoseService,
  ) {
    this.schoolRepository = this.dataSource.getRepository(School);
    this.userRepository = this.dataSource.getRepository(User);
  }

  async send(data: MultiMixedMessages): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const allInvalidTokens: string[] = [];
    let fcmSuccessCount: number = 0;
    let fcmFailureCount: number = 0;
    let smsSuccessCount: number = 0;
    let smsFailureCount: number = 0;
    const school = await this.getSchool(+data.schoolId);

    // todo. if type is DISPATCH_NEWS, dedupe may be needed
    // it's considered as SMS if token is not available
    const fcmMessages = data.messages.filter((msg) => msg.token);
    const smsMessages = data.messages.filter((msg) => !msg.token);

    //? FCM 전송
    if (fcmMessages.length > 0) {
      const multiFcmMessages: MultiFcmMessages = {
        messages: fcmMessages.map((msg) => ({
          id: msg.id,
          token: msg.token!,
          title: (msg.title ?? school.name) as string | undefined,
          body: msg.body,
          role: msg.role,
          page: msg.page,
          args: msg.args,
        })),
        type: data.type,
        schoolId: data.schoolId,
        role: data.role,
      };

      const fcmResult =
        await this.fcmService.sendMultipleMessagesToMultipleDestinations(
          multiFcmMessages,
        );

      // FCM 결과를 NotificationResult 형식으로 변환
      fcmResult.results.forEach((result) => {
        results.push({
          success: result.success,
          error: result.error,
          id: result.id,
        });
      });

      fcmSuccessCount = fcmResult.successCount;
      fcmFailureCount = fcmResult.failureCount;

      // Invalid tokens 수집
      allInvalidTokens.push(...fcmResult.invalidTokens);
    }

    // Invalid tokens 일괄 무효화
    if (allInvalidTokens.length > 0) {
      await this.nullifyUserPushTokens(allInvalidTokens);
    }

    //? SMS 전송
    if (school.phone === null || school.messageType === MessageType.FCM) {
      this.logger.log(
        `🖐️ ${school.name} phone: ${school.phone}, mode: ${school.messageType}`,
      );
      // 모두 실패처리
      smsMessages.map((msg) => {
        results.push({
          success: false,
          error:
            school.messageType === MessageType.FCM
              ? new Error('School activates frugal mode')
              : new Error('School phone is not set'),
          id: msg.id,
        });
      });
      smsSuccessCount = 0;
      smsFailureCount = smsMessages.length;
    } else {
      this.logger.log(
        `🖐️ ${smsMessages.length} sms messages sent from ${school.phone}`,
      );

      if (smsMessages.length > 0) {
        const multiSmsMessages: MultiSmsMessages = {
          messages: smsMessages.map((msg) => ({
            id: msg.id,
            phone: msg.phone!,
            title: (msg.title ?? school.name) as string | undefined,
            body: msg.body,
          })),
          type: data.type,
          schoolId: data.schoolId,
          role: data.role,
        };

        const smsResult =
          await this.aligoService.sendMultipleMessagesToMultipleDestinations(
            multiSmsMessages,
            school.phone,
          );
        console.log(`🔥 smsResult: ${JSON.stringify(smsResult)}`);

        smsResult.results.forEach((result) => {
          results.push({
            success: result.success,
            error: result.error,
            id: result.id,
          });
        });

        smsSuccessCount = smsResult.successCount;
        smsFailureCount = smsResult.failureCount;
      }
    }

    if (data.role === 'PARENT' || smsMessages.length > 0) {
      await this.logToFirehose(
        data,
        school,
        results,
        fcmSuccessCount,
        fcmFailureCount,
        smsSuccessCount,
        smsFailureCount,
      );
    }

    return results;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 나머지 private 함수들
  //? ---------------------------------------------------------------------- ?//

  private async getSchool(id: number): Promise<School> {
    return await this.schoolRepository.findOneOrFail({ where: { id } });
  }

  private async nullifyUserPushTokens(tokens: string[]): Promise<void> {
    await this.userRepository.update(
      {
        pushToken: In(tokens),
      },
      {
        pushToken: null,
      },
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? Firehose 로그 전송
  //? ---------------------------------------------------------------------- ?//

  private async logToFirehose(
    data: MultiMixedMessages,
    school: School,
    results: NotificationResult[],
    fcmSuccessCount: number,
    fcmFailureCount: number,
    smsSuccessCount: number,
    smsFailureCount: number,
  ): Promise<NotificationResult> {
    try {
      const now = new Date();
      const seoulTimeZone = 'Asia/Seoul';

      const partitionedLogData = {
        // 기본 로그 정보 (원본 필드명 제거하고 파티션 필드명으로 통일)
        type: data.type, // 파티션 키
        school: `${data.schoolId}`, // 파티션 키
        school_name: school.name, // 학교 이름
        title:
          data.messages.length > 1
            ? `${data.messages[0].title} 외 ${data.messages.length - 1}건`
            : data.messages[0].title, // 첫 번째 메시지의 title
        body:
          data.messages.length > 1
            ? `${data.messages[0].body} 외 ${data.messages.length - 1}건`
            : data.messages[0].body, // 첫 번째 메시지의 body
        ids: results.map((v) => v.id), // 결과 배열의 id 필드 추출
        role: data.role, // PARENT or INSTRUCTOR (일반 컬럼)

        // 시간 기반 파티션 키
        year: formatInTimeZone(now, seoulTimeZone, 'yyyy'),
        month: formatInTimeZone(now, seoulTimeZone, 'MM'),
        day: formatInTimeZone(now, seoulTimeZone, 'dd'),
        hour: formatInTimeZone(now, seoulTimeZone, 'HH'),

        // 성과 메트릭
        total: results.length,
        success: results.filter((v) => v.success).length,
        failure: results.filter((v) => !v.success).length,
        fcm_success: fcmSuccessCount || 0,
        fcm_failure: fcmFailureCount || 0,
        sms_success: smsSuccessCount || 0,
        sms_failure: smsFailureCount || 0,
        // 사람 친화적 서울 시간대 타임스탬프
        timestamp: formatInTimeZone(now, seoulTimeZone, 'yyyy-MM-dd HH:mm:ss'),
      };

      await this.firehoseService.sendRecord(partitionedLogData);
      this.logger.log(`A ${data.type} log sent to Firehose`);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send log to Firehose', error);

      return { success: false, error: error as Error };
    }
  }
}
