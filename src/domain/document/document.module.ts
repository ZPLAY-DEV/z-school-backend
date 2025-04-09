import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from 'src/domain/document/entities/document.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Document])],
  providers: [DocumentService],
  controllers: [DocumentController],
})
export class DocumentModule {}
