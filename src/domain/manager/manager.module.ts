import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { UploadModule } from 'src/services/upload/upload.module';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';

@Module({
  imports: [TypeOrmModule.forFeature([Manager, User]), UploadModule],
  exports: [ManagerService],
  providers: [ManagerService],
  controllers: [ManagerController],
})
export class ManagerModule {}
