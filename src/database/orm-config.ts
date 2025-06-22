import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { getAwsDatabaseConfig } from 'src/common/config/aws-database';
import { IAwsConfig, IRdbConfig } from 'src/common/interfaces';

@Injectable()
export class OrmConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    // const nodeEnv = this.configService.getOrThrow<string>('nodeEnv');
    const isProduction = process.env.NODE_ENV === 'production';
    const awsConfig = this.configService.getOrThrow<IAwsConfig>('aws');

    // if (nodeEnv === 'ecs' && !awsConfig) {
    //   throw new Error('AWS configuration is required in ECS environment');
    // }
    if (isProduction && !awsConfig) {
      throw new Error('AWS configuration is not defined.');
    }

    const databaseConfig = isProduction
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
      synchronize: !isProduction,
      timezone: 'Z', // UTC
      bigNumberStrings: true,
      supportBigNumbers: true,
      logging: !isProduction,
      // migrations: ['dist/migrations/**/*{.ts,.js}'],
      // cli: {
      //   migrationsDir: 'dist/migrations',
      // },
    };
  }
}
