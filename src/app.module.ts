import KeyvRedis, { Keyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryModule } from '@sentry/nestjs/setup';
import { DynamooseModule } from 'nestjs-dynamoose';
import { join } from 'path';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { configuration } from 'src/common/config/configuration';
import { SentryCatchAllFilter } from 'src/common/filters/sentry-catch-all.filter';
import { DuplicateEntryErrorInterceptor } from 'src/common/interceptors/duplicate-entry-error.interceptor';
import { AttendanceModule } from 'src/domain/attendance/attendance.module';
import { AuthModule } from 'src/domain/auth/auth.module';
import { JwtAuthGuard } from 'src/domain/auth/guards/jwt-auth.guard';
import { BookingModule } from 'src/domain/booking/booking.module';
import { CalendarModule } from 'src/domain/calendar/calendar.module';
import { CategoryModule } from 'src/domain/category/category.module';
import { EventModule } from 'src/domain/event/event.module';
import { GroupModule } from 'src/domain/group/group.module';
import { InstructorModule } from 'src/domain/instructor/instructor.module';
import { LedgerModule } from 'src/domain/ledger/ledger.module';
import { LessonModule } from 'src/domain/lesson/lesson.module';
import { LetterModule } from 'src/domain/letter/letter.module';
import { ManagerModule } from 'src/domain/manager/manager.module';
import { OfferingModule } from 'src/domain/offering/offering.module';
import { ParentModule } from 'src/domain/parent/parent.module';
import { PayoutModule } from 'src/domain/payout/payout.module';
import { SamModule } from 'src/domain/sam/sam.module';
import { SchoolModule } from 'src/domain/school/school.module';
import { SchooldayModule } from 'src/domain/schoolday/schoolday.module';
import { StatementModule } from 'src/domain/statement/statement.module';
import { StudentModule } from 'src/domain/student/student.module';
import { SubsidyModule } from 'src/domain/subsidy/subsidy.module';
import { TermModule } from 'src/domain/term/term.module';
import { TextModule } from 'src/domain/text/text.module';
import { UserModule } from 'src/domain/user/user.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { SlackModule } from 'src/services/slack/slack.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { OrmConfig } from './database/orm-config';
import { BoardModule } from './domain/board/board.module';
import { UploadModule } from './services/upload/upload.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'development'
          ? '.env.development'
          : '.env.production',
      load: [configuration],
    }),
    SentryModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'static'), // for index.html
    }),
    TypeOrmModule.forRootAsync({
      useClass: OrmConfig,
      dataSourceFactory: async (options: DataSourceOptions) => {
        if (!options) {
          throw new Error('DataSource options are required');
        }
        const dataSource = await new DataSource(options).initialize();
        return dataSource;
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.getOrThrow<string>(
          'redis.host',
          'localhost',
        );
        const port = configService.getOrThrow<number>('redis.port', 6379);
        const url = `redis://${host}:${port}`;
        const redisStore = new KeyvRedis(url);
        const keyvStore = new Keyv({ store: redisStore });

        return {
          stores: [keyvStore],
          ttl: 60 * 5 * 1000, // 5분 (300,000ms)
        };
      },
    }),
    DynamooseModule.forRoot({
      local:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:4566'
          : false,
      aws: {
        region: process.env.AWS_DEFAULT_REGION ?? 'ap-northeast-2',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      table: {
        create: process.env.NODE_ENV === 'development', // create dynamo tables in local env
        prefix: `${process.env.NODE_ENV}_`,
        suffix: '_table',
      },
    }),
    AttendanceModule,
    AuthModule,
    BoardModule,
    BookingModule,
    CalendarModule,
    CategoryModule,
    EventModule,
    GroupModule,
    InstructorModule,
    LedgerModule,
    LessonModule,
    LetterModule,
    ManagerModule,
    OfferingModule,
    ParentModule,
    PayoutModule,
    RedisModule,
    SamModule,
    SchooldayModule,
    SchoolModule,
    SlackModule,
    StatementModule,
    StudentModule,
    SubsidyModule,
    TermModule,
    TextModule,
    UploadModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DuplicateEntryErrorInterceptor, // 중복입력은 400으로 전환
    },
    // {
    //   provide: APP_FILTER,
    //   useClass: ValidationCatchAllFilter, // 디버깅 편리하도록 validation 오류 로깅
    // },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: HttpCacheInterceptor,
    // },
    {
      provide: APP_FILTER,
      useClass: SentryCatchAllFilter, // 500 이상오류, Sentry/Slack 보고
    },
    AppService,
  ],
})
export class AppModule {}
