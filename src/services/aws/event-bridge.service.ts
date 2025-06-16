import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
} from '@aws-sdk/client-eventbridge';

@Injectable()
export class EventBridgeService implements OnModuleInit {
  private readonly client: EventBridgeClient;
  private readonly logger = new Logger(EventBridgeService.name);

  constructor() {
    this.client = new EventBridgeClient({
      region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    });
  }

  //? create event bridge rule
  async createRule(
    ruleName: string,
    cronExpression: string,
    description: string,
  ) {
    try {
      const command = new PutRuleCommand({
        Name: ruleName,
        ScheduleExpression: cronExpression,
        State: 'ENABLED',
        Description: description,
      });
      const response = await this.client.send(command);
      this.logger.log(`Rule created: ${ruleName}, ARN: ${response.RuleArn}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to create rule ${ruleName}: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to create EventBridge rule: ${error.message}`,
      );
    }
  }

  //? add Target with Lambda
  async addTarget(
    ruleName: string,
    targets: { id: string; arn: string; input?: any }[],
  ) {
    try {
      const command = new PutTargetsCommand({
        Rule: ruleName,
        Targets: targets.map((target) => ({
          Id: target.id,
          Arn: target.arn,
          Input: target.input ? JSON.stringify(target.input) : undefined,
        })),
      });
      const response = await this.client.send(command);
      this.logger.log(`Targets added to rule ${ruleName}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to add targets to ${ruleName}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Failed to add targets: ${error.message}`,
      );
    }
  }

  onModuleInit() {
    this.logger.log(
      `✅ AWS EventBridge service initialized for region: ${process.env.AWS_DEFAULT_REGION}`,
    );
  }

  // async createScheduledRule(
  //   ruleName: string,
  //   scheduleTime: string,
  //   lambdaArn: string,
  //   inputData: any,
  // ) {
  //   try {
  //     // scheduleTime은 UTC 시간 (toISOString 결과)
  //     const utcTime = new Date(scheduleTime);
  //     if (isNaN(utcTime.getTime())) {
  //       throw new Error('Invalid scheduleTime format');
  //     }

  //     // KST 시간 로깅 (디버깅용)
  //     const kstTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000); // UTC → KST
  //     console.log(
  //       'UTC time:',
  //       utcTime.toISOString(),
  //       'KST time:',
  //       kstTime.toISOString(),
  //     );

  //     const cronExpression = `cron(${utcTime.getUTCMinutes()} ${utcTime.getUTCHours()} ${utcTime.getUTCDate()} ${utcTime.getUTCMonth() + 1} ? ${utcTime.getUTCFullYear()})`;
  //     console.log('Cron expression:', cronExpression);

  //     // Lambda 함수 존재 여부 확인
  //     const getFunctionCommand = new GetFunctionCommand({
  //       FunctionName: lambdaArn,
  //     });
  //     const functionResponse = await this.lambdaClient.send(getFunctionCommand);
  //     console.log(
  //       'Lambda function exists:',
  //       functionResponse.Configuration?.FunctionName,
  //     );

  //     // EventBridge Rule 생성
  //     const putRuleCommand = new PutRuleCommand({
  //       Name: ruleName,
  //       ScheduleExpression: cronExpression,
  //       State: 'ENABLED',
  //       Description: `Scheduled rule for Lambda at ${kstTime.toISOString()} KST`,
  //     });
  //     const ruleResponse = await this.eventBridgeClient.send(putRuleCommand);
  //     console.log('Rule created:', ruleResponse);

  //     // Lambda를 타겟으로 연결
  //     const putTargetsCommand = new PutTargetsCommand({
  //       Rule: ruleName,
  //       Targets: [
  //         {
  //           Id: '1',
  //           Arn: lambdaArn,
  //           Input: JSON.stringify(inputData),
  //         },
  //       ],
  //     });
  //     const targetResponse =
  //       await this.eventBridgeClient.send(putTargetsCommand);
  //     console.log('Target set:', targetResponse);

  //     // Lambda에 EventBridge 호출 권한 부여
  //     const addPermissionCommand = new AddPermissionCommand({
  //       FunctionName: lambdaArn,
  //       StatementId: `EventBridge-${ruleName}`,
  //       Action: 'lambda:InvokeFunction',
  //       Principal: 'events.amazonaws.com',
  //       SourceArn: `arn:aws:events:${this.configService.get<string>('AWS_DEFAULT_REGION')}:000000000000:rule/${ruleName}`,
  //     });
  //     const permissionResponse =
  //       await this.lambdaClient.send(addPermissionCommand);
  //     console.log('Permission added:', permissionResponse);

  //     return {
  //       ruleName,
  //       cronExpression,
  //       message: `Rule ${ruleName} created to trigger Lambda at ${kstTime.toISOString()} KST`,
  //     };
  //   } catch (error) {
  //     console.error('Error creating EventBridge rule:', error);
  //     throw new InternalServerErrorException(
  //       `Failed to create EventBridge rule: ${error.message}`,
  //     );
  //   }
  // }
}
