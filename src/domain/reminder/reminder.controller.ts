import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { IS3Urls } from 'src/common/interfaces';
import { CreateReminderDto } from 'src/domain/reminder/dto/create-reminder.dto';
import { UpdateReminderDto } from 'src/domain/reminder/dto/update-reminder.dto';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';
import { ReminderService } from 'src/domain/reminder/reminder.service';
import {
  CreateReminderDocs,
  DeleteReminderDocs,
  FindReminderByIdDocs,
  GenerateReminderS3UrlsDocs,
  MarkAsReadByParentDocs,
  MarkAsReadByStudentDocs,
  UpdateReminderDocs,
} from 'src/domain/reminder/swagger/reminder-swagger.decorator';
import { UploadService } from 'src/services/upload/upload.service';

@ApiTags('✳️ Reminders ( 수강신청 안내 )')
@Controller('reminders')
@UseInterceptors(ClassSerializerInterceptor)
export class ReminderController {
  constructor(
    private readonly reminderService: ReminderService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @CreateReminderDocs()
  @Post()
  async createReminder(@Body() dto: CreateReminderDto): Promise<Reminder> {
    return await this.reminderService.createReminder(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @FindReminderByIdDocs()
  @Get(':id')
  async findDetailById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Reminder> {
    return await this.reminderService.findById(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateReminderDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReminderDto,
  ): Promise<Reminder> {
    return await this.reminderService.update(id, dto);
  }

  @MarkAsReadByParentDocs()
  @Public()
  @Patch(':id/parents/:parentId/read')
  async markAsReadByParent(
    @Param('id', ParseIntPipe) reminderId: number,
    @Param('parentId', ParseIntPipe) parentId: number,
  ): Promise<void> {
    return await this.reminderService.markAsReadByParent(reminderId, parentId);
  }

  @MarkAsReadByStudentDocs()
  @Public()
  @Patch(':id/students/:studentId/read')
  async markAsReadByStudent(
    @Param('id', ParseIntPipe) reminderId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<void> {
    return await this.reminderService.markAsReadByStudent(
      reminderId,
      studentId,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteReminderDocs()
  @Delete(':id')
  async deleteReminder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Reminder> {
    return await this.reminderService.delete(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Extras
  //? ---------------------------------------------------------------------- ?//

  @GenerateReminderS3UrlsDocs()
  @Post('s3urls')
  async generateS3Urls(
    @Body()
    dto: {
      schoolId: number;
      termId: number;
      mimeType: string;
      filename?: string;
    },
  ): Promise<IS3Urls> {
    const path = [
      `schools`,
      `${dto.schoolId}`,
      `terms`,
      `${dto.termId}`,
      `reminders`,
    ].join('/');
    return await this.uploadService.generateUploadUrls(
      path,
      dto.mimeType,
      dto.filename,
    );
  }
}
