import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/domain/category/entities/category.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Subsidy } from 'src/domain/subsidy/entities/subsidy.entity';
import { Provider } from 'src/domain/user/entities/provider.entity';
import { Secret } from 'src/domain/user/entities/secret.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { UserNotificationListener } from 'src/domain/user/listeners/user-notification.listener';
import { UserOtpController } from 'src/domain/user/user-otp.controller';
import { UserOtpService } from 'src/domain/user/user-otp.service';
import { UserController } from 'src/domain/user/user.controller';
import { UserService } from 'src/domain/user/user.service';
import { S3Module } from 'src/services/aws/s3.module';
// import { SesModule } from 'src/services/aws/ses.module';
import { SqsModule } from 'src/services/aws/sqs.module';
import { FcmModule } from 'src/services/fcm/fcm.module';
import { SlackModule } from 'src/services/slack/slack-module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Subsidy,
      Provider,
      Secret,
      User,
      Parent,
      Student,
      Instructor,
      Manager,
    ]),
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 1000,
        limit: 2,
      },
    ]),
    UploadModule,
    S3Module,
    // SesModule,
    SqsModule,
    SlackModule,
    FcmModule,
  ],
  exports: [UserService], //? being used in auth.module.ts
  providers: [
    UserNotificationListener, //? for event emitter
    UserService,
    UserOtpService,
  ],
  controllers: [UserController, UserOtpController],
})
export class UserModule {}
