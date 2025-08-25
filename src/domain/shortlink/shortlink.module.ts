import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { ShortlinkController } from 'src/domain/shortlink/shortlink.controller';
import { ShortlinkService } from 'src/domain/shortlink/shortlink.service';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shortlink]), UploadModule],
  controllers: [ShortlinkController],
  providers: [ShortlinkService],
})
export class ShortlinkModule {}
