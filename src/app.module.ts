import KeyvRedis, { Keyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryModule } from '@sentry/nestjs/setup';
import { DynamooseModule } from 'nestjs-dynamoose';
import { join } from 'path';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { configuration } from 'src/common/config/configuration';
import { CustomCatchAllFilter } from 'src/common/filters/custom-catch-all.filter';
import { JwtContextGuard } from 'src/common/guards/jwt-context.guard';
import { DuplicateEntryErrorInterceptor } from 'src/common/interceptors/duplicate-entry-error.interceptor';
import { AttendanceModule } from 'src/domain/attendance/attendance.module';
import { AuthModule } from 'src/domain/auth/auth.module';
import { BookingModule } from 'src/domain/booking/booking.module';
import { CalendarModule } from 'src/domain/calendar/calendar.module';
import { CategoryModule } from 'src/domain/category/category.module';
import { ContractModule } from 'src/domain/contract/contract.module';
import { DepartureModule } from 'src/domain/departure/departure.module';
import { GroupModule } from 'src/domain/group/group.module';
import { InstructorModule } from 'src/domain/instructor/instructor.module';
import { LedgerModule } from 'src/domain/ledger/ledger.module';
import { LessonModule } from 'src/domain/lesson/lesson.module';
import { ManagerModule } from 'src/domain/manager/manager.module';
import { NewsletterModule } from 'src/domain/newsletter/newsletter.module';
import { NotifiableModule } from 'src/domain/notifiable/notifiable.module';
import { OfferingModule } from 'src/domain/offering/offering.module';
import { ParentModule } from 'src/domain/parent/parent.module';
import { PayoutModule } from 'src/domain/payout/payout.module';
import { PickModule } from 'src/domain/pick/pick.module';
import { ReminderModule } from 'src/domain/reminder/reminder.module';
import { SamModule } from 'src/domain/sam/sam.module';
import { SchoolModule } from 'src/domain/school/school.module';
import { SchooldayModule } from 'src/domain/schoolday/schoolday.module';
import { StatementModule } from 'src/domain/statement/statement.module';
import { StudentModule } from 'src/domain/student/student.module';
import { SubsidyModule } from 'src/domain/subsidy/subsidy.module';
import { SurveyModule } from 'src/domain/survey/survey.module';
import { TermModule } from 'src/domain/term/term.module';
import { TextModule } from 'src/domain/text/text.module';
import { UserModule } from 'src/domain/user/user.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { SlackModule } from 'src/services/slack/slack.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { OrmConfig } from './database/orm-config';
import { UploadModule } from './services/upload/upload.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'static'), // for index.html
      // renderPath: '/', // uncomment 하면 ECS배포 시 404 오류로 배포불가
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
    DynamooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('nodeEnv');
        const awsEndpoint = configService.get<string>('aws.endpoint');
        const awsConfig = {
          region:
            configService.get<string>('aws.defaultRegion') ?? 'ap-northeast-2',
        };

        return {
          local: awsEndpoint ? awsEndpoint : false,
          aws: awsConfig,
          table: {
            create: awsEndpoint ? true : false,
            prefix: `${nodeEnv}_`,
            suffix: '_table',
          },
        };
      },
    }),
    AttendanceModule,
    AuthModule,
    BookingModule,
    CalendarModule,
    CategoryModule,
    ContractModule,
    DepartureModule,
    GroupModule,
    InstructorModule,
    JwtModule,
    LedgerModule,
    LessonModule,
    NewsletterModule,
    NotifiableModule,
    ReminderModule,
    ManagerModule,
    OfferingModule,
    ParentModule,
    PayoutModule,
    PickModule,
    RedisModule,
    SamModule,
    SchooldayModule,
    SchoolModule,
    SlackModule,
    StatementModule,
    StudentModule,
    SubsidyModule,
    SurveyModule,
    TermModule,
    TextModule,
    UploadModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtContextGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DuplicateEntryErrorInterceptor, // 중복입력은 400으로 전환
    },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: HttpCacheInterceptor,
    // },
    {
      provide: APP_FILTER,
      useClass: CustomCatchAllFilter, // 모든 오류 처리 (validation 오류 상세 메시지 + Sentry/Slack 보고)
    },
    AppService,
  ],
})
export class AppModule {}
