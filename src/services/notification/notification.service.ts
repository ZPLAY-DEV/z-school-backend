import { Inject, Injectable, Logger } from '@nestjs/common';
import { formatInTimeZone } from 'date-fns-tz';
import { AWS_SQS_CLIENT } from 'src/common/constants';
import { School } from 'src/domain/school/entities/school.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { SqsService } from 'src/services/aws/sqs.service';
import {
  MultiMixedMessages,
  NotificationResult,
} from 'src/services/notification/types';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly schoolRepository: Repository<School>;
  private readonly userRepository: Repository<User>;

  constructor(
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
    private readonly firehoseService: FirehoseService,
    private readonly dataSource: DataSource,
  ) {
    this.schoolRepository = this.dataSource.getRepository(School);
    this.userRepository = this.dataSource.getRepository(User);
  }

  async send(data: MultiMixedMessages): Promise<{
    success: boolean;
  }> {
    try {
      await this.sqsClient.sendMessage({
        type: 'SEND_MESSAGES',
        data,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send message to SQS', error);
      return { success: false };
    }
  }

  async text(data: { body: string; phone: string }): Promise<{
    success: boolean;
  }> {
    try {
      await this.sqsClient.sendMessage({
        type: 'SEND_TEXT',
        data,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send message to SQS', error);
      return { success: false };
    }
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

      console.log(`🔥 data: ${JSON.stringify(data)}`);
      console.log(`🔥 results: ${JSON.stringify(results)}`);
      const partitionedLogData = {
        // 기본 로그 정보 (원본 필드명 제거하고 파티션 필드명으로 통일)
        type: data.type, // 파티션 키
        school: `${data.schoolId}`, // 파티션 키
        school_name: school.name, // 학교 이름
        title:
          data.messages.length > 1
            ? `${data.messages[0].title ?? school.name} 외 ${data.messages.length - 1}건`
            : data.messages[0]?.title, // 첫 번째 메시지의 title
        body:
          data.messages.length > 1
            ? `${data.messages[0].body} 외 ${data.messages.length - 1}건`
            : data.messages[0]?.body, // 첫 번째 메시지의 body
        ids: data.messages.map((v) => v.id), // 결과 배열의 id 필드 추출
        role: data.role, // PARENT or INSTRUCTOR (일반 컬럼)

        // 시간 기반 파티션 키
        year: formatInTimeZone(now, seoulTimeZone, 'yyyy'),
        month: formatInTimeZone(now, seoulTimeZone, 'MM'),
        day: formatInTimeZone(now, seoulTimeZone, 'dd'),
        hour: formatInTimeZone(now, seoulTimeZone, 'HH'),

        // 성과 메트릭
        total: data.messages.length,
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
