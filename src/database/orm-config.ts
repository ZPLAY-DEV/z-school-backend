import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { getAwsDatabaseConfig } from 'src/common/config/aws-database';
import { IAwsConfig, IRdbConfig } from 'src/common/interfaces';

@Injectable()
export class OrmConfig implements TypeOrmOptionsFactory {
  private readonly environment: string;
  constructor(private readonly configService: ConfigService) {
    this.environment = this.configService.get<string>('nodeEnv', 'dev');
    console.log('🚀 ~ OrmConfig ~ this.environment:', this.environment);
  }

  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    const awsConfig = this.configService.getOrThrow<IAwsConfig>('aws');

    // if (nodeEnv === 'ecs' && !awsConfig) {
    //   throw new Error('AWS configuration is required in ECS environment');
    // }
    if (this.environment === 'prod' && !awsConfig) {
      throw new Error('AWS configuration is not defined.');
    }

    const databaseConfig =
      this.environment === 'prod'
        ? await getAwsDatabaseConfig(awsConfig)
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
      // migrations: ['dist/database/migrations/*.js'],
      // migrationsTableName: 'migrations',
      // migrationsRun: false,
    };
  }
}
