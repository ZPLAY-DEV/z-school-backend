import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { IAwsConfig, IRdbConfig } from 'src/common/interfaces';

@Injectable()
export class OrmConfig implements TypeOrmOptionsFactory {
  private readonly environment: string;

  constructor(private readonly configService: ConfigService) {
    this.environment = this.configService.get<string>('nodeEnv', 'dev');
  }

  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    const awsConfig = this.configService.getOrThrow<IAwsConfig>('aws');

    if (this.environment === 'prod' && !awsConfig) {
      throw new Error('AWS configuration is not defined.');
    }

    const databaseConfig =
      this.environment === 'prod'
        ? await this.getAwsDatabaseConfig(awsConfig)
        : this.configService.getOrThrow<IRdbConfig>('database');

    if (!databaseConfig) {
      throw new Error('Database configuration is not defined');
    }
    return {
      type: databaseConfig.engine as 'mysql',
      host: databaseConfig.host,
      port: databaseConfig.port,
      username: databaseConfig.username,
      password: databaseConfig.password,
      database: databaseConfig.dbname,
      subscribers: ['dist/**/*.subscriber{.ts,.js}'],
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: this.environment !== 'prod',
      timezone: 'Z', // UTC
      bigNumberStrings: true,
      supportBigNumbers: true,
      logging: this.environment !== 'prod',
      // Connection pool settings for high concurrency
      extra: {
        connectionLimit: 30, // MySQL 커넥션 풀 크기 (Redis 캐시 사용 시 충분)
        waitForConnections: true,
        queueLimit: 0, // 무제한 큐
        acquireTimeout: 10000, // 커넥션 획득 타임아웃: 10초
        connectTimeout: 10000, // 연결 타임아웃: 10초
      },
      // migrations: ['dist/database/migrations/*.js'],
      // migrationsTableName: 'migrations',
      // migrationsRun: false,
    };
  }

  getAwsDatabaseConfig = async (awsConfig: IAwsConfig): Promise<IRdbConfig> => {
    const client = new SSMClient({
      region: awsConfig.defaultRegion,
    });
    const getParameterCommand = new GetParameterCommand({
      Name: awsConfig.ssmParameterName,
      WithDecryption: true,
    });
    const { Parameter } = await client.send(getParameterCommand);
    if (!Parameter?.Value || typeof Parameter.Value !== 'string') {
      throw new Error('Parameter value is undefined or not a string');
    }

    const parameterValue: string = Parameter.Value;
    return JSON.parse(parameterValue) as IRdbConfig;
  };
}
