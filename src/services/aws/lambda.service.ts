import {
  AddPermissionCommand,
  GetFunctionCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class LambdaService implements OnModuleInit {
  private readonly client: LambdaClient;
  private readonly logger = new Logger(LambdaService.name);
  constructor() {
    this.client = new LambdaClient({
      region: process.env.AWS_DEFAULT_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    });
  }

  async verifyFunction(lambdaArn: string) {
    try {
      const command = new GetFunctionCommand({ FunctionName: lambdaArn });
      const response = await this.client.send(command);
      this.logger.log(
        `Lambda function verified: ${response.Configuration?.FunctionName}`,
      );
      return response;
    } catch (error) {
      console.log('error ->', error);
      this.logger.error(
        `Failed to verify Lambda ${lambdaArn}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Lambda function not found: ${error.message}`,
      );
    }
  }

  async addEventBridgePermission(
    lambdaArn: string,
    ruleName: string,
    ruleArn: string,
  ) {
    try {
      const command = new AddPermissionCommand({
        FunctionName: lambdaArn,
        StatementId: `EventBridge-${ruleName}`,
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: ruleArn,
      });
      const response = await this.client.send(command);
      this.logger.log(`Permission added to ${lambdaArn} for rule ${ruleName}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to add permission to ${lambdaArn}: ${error.message}`,
      );
      console.log('error ->', error);
      throw new InternalServerErrorException(
        `Failed to add permission: ${error.message}`,
      );
    }
  }

  onModuleInit() {
    this.logger.log(
      `✅ AWS Lambda service initialized for region: ${process.env.AWS_DEFAULT_REGION}`,
    );
  }
}
