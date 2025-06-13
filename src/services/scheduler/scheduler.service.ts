// scheduler/scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventBridgeService } from '../aws/event-bridge.service';
import { LambdaService } from '../aws/lambda.service';
import { SqsService } from '../aws/sqs.service';

// @Todo 공용 Interface 로 분리
interface ScheduleOptions {
  ruleName: string;
  scheduleTime?: Date; // 단일 실행 시간
  scheduleExpression?: string; // cron 또는 rate 표현식
  targets: { id: string; arn: string; input?: any }[];
  description?: string;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly eventBridgeService: EventBridgeService,
    private readonly lambdaService: LambdaService,
    private readonly sqsService: SqsService,
  ) {}

  async schedule(options: ScheduleOptions) {
    try {
      //? 1) cron expression 생성  ( 클라이언트에서 전달 받은 예약 시간을 기반으로 동작 )
      let scheduleExpression = options.scheduleExpression;
      if (!scheduleExpression && options.scheduleTime) {
        const utcTime = new Date(options.scheduleTime);
        if (isNaN(utcTime.getTime())) {
          throw new Error('Invalid schedule time format');
        }
        scheduleExpression = `cron(${utcTime.getUTCMinutes()} ${utcTime.getUTCHours()} ${utcTime.getUTCDate()} ${
          utcTime.getUTCMonth() + 1
        } ? ${utcTime.getUTCFullYear()})`;
        this.logger.log(`Generated cron expression: ${scheduleExpression}`);
      }

      if (!scheduleExpression) {
        throw new Error(
          'Either scheduleTime or scheduleExpression must be provided',
        );
      }

      //? 2)scheduleTime이 존재할 경우 단순 KST 시간대가 일치하는지를 체크하기 위한 로깅용 ( 제거해도 무방 or slack web hook)
      if (options.scheduleTime) {
        const kstTime = new Date(
          options.scheduleTime.getTime() + 9 * 60 * 60 * 1000,
        );

        this.logger.log(`
          Scheduling:
          UTC: ${options.scheduleTime.toISOString()}
          KST: ${kstTime.toISOString()}
          ruleName: ${options.ruleName}
          scheduleExpression: ${scheduleExpression}
          description: ${options.description}
          `);
      }

      //? 3) EventBridge Rule 생성
      await this.eventBridgeService.createRule(
        options.ruleName,
        scheduleExpression,
        options.description || `Scheduled rule for ${options.ruleName}`,
      );

      //? 4) EventBridge Rule 에 Target 추가
      await this.eventBridgeService.addTarget(
        options.ruleName,
        options.targets,
      );

      //? 5) arn 생성 후 해당 규칙에 맞는 SQS에 대한 정책 업데이트
      const ruleArn = `arn:aws:events:${process.env.AWS_DEFAULT_REGION || 'ap-northeast-2'}:000000000000:rule/${options.ruleName}`;
      for (const target of options.targets) {
        if (target.arn.includes(':sqs:')) {
          await this.sqsService.updateQueuePolicy(ruleArn);
        }
      }

      return {
        ruleName: options.ruleName,
        scheduleExpression,
        message: `Scheduled rule ${options.ruleName} with ${options.targets.length} target(s)`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to schedule ${options.ruleName}: ${error.message}`,
      );
      throw error;
    }

    // lambda Target Scheduler
    // try {
    //   // Generate schedule expression if not provided
    //   let scheduleExpression = options.scheduleExpression;
    //   if (!scheduleExpression && options.scheduleTime) {
    //     const utcTime = new Date(options.scheduleTime);
    //     if (isNaN(utcTime.getTime())) {
    //       throw new Error('Invalid schedule time format');
    //     }
    //     scheduleExpression = `cron(${utcTime.getUTCMinutes()} ${utcTime.getUTCHours()} ${utcTime.getUTCDate()} ${
    //       utcTime.getUTCMonth() + 1
    //     } ? ${utcTime.getUTCFullYear()})`;
    //     this.logger.log(`Generated cron expression: ${scheduleExpression}`);
    //   }
    //   if (!scheduleExpression) {
    //     throw new Error(
    //       'Either scheduleTime or scheduleExpression must be provided',
    //     );
    //   }
    //   //? scheduleTime이 존재할 경우 단순 KST 시간대가 일치하는지를 체크하기 위한 로깅용 ( 제거해도 무방 or slack web hook)
    //   if (options.scheduleTime) {
    //     const kstTime = new Date(
    //       options.scheduleTime.getTime() + 9 * 60 * 60 * 1000,
    //     );
    //     this.logger.log(
    //       `
    //       Scheduling:
    //       UTC: ${options.scheduleTime.toISOString()},
    //       KST: ${kstTime.toISOString()}
    //       ruleName: ${options.ruleName}
    //       scheduleExpression: ${scheduleExpression}
    //       description: ${options.description}
    //       `,
    //     );
    //   }
    //   //? Scheduler 등록시
    //   for (const target of options.targets) {
    //     if (target.arn.includes(':lambda:')) {
    //       await this.lambdaService.verifyFunction(target.arn);
    //     }
    //   }
    //   //? EventBridge Rule 생성
    //   await this.eventBridgeService.createRule(
    //     options.ruleName,
    //     scheduleExpression,
    //     options.description || `Scheduled rule for ${options.ruleName}`,
    //   );
    //   //? EventBridge Rule 에 Target 추가
    //   await this.eventBridgeService.addTarget(
    //     options.ruleName,
    //     options.targets,
    //   );
    //   // Add permissions for Lambda targets
    //   const ruleArn = `arn:aws:events:${process.env.AWS_DEFAULT_REGION || 'ap-northeast-2'}:000000000000:rule/${options.ruleName}`;
    //   for (const target of options.targets) {
    //     if (target.arn.includes(':lambda:')) {
    //       await this.lambdaService.addEventBridgePermission(
    //         target.arn,
    //         options.ruleName,
    //         ruleArn,
    //       );
    //     }
    //   }
    //   return {
    //     ruleName: options.ruleName,
    //     scheduleExpression,
    //     message: `Scheduled rule ${options.ruleName} with ${options.targets.length} target(s)`,
    //   };
    // } catch (error) {
    //   this.logger.error(
    //     `Failed to schedule ${options.ruleName}: ${error.message}`,
    //   );
    //   throw error;
    // }
  }
}
