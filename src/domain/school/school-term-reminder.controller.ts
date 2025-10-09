import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';
import { SchoolTermReminderService } from 'src/domain/school/school-term-reminder.service';
import { GetReminderDocs } from 'src/domain/school/swagger/school-reminder-swagger.decorator';

@ApiTags('✳️ Schools > Terms > Reminders ( 학교 > 학기 > 수강신청 안내 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermReminderController {
  constructor(
    private readonly schoolTermReminderService: SchoolTermReminderService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetReminderDocs()
  @Get(':schoolId/terms/:termId/reminders')
  async getReminder(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Reminder> {
    return await this.schoolTermReminderService.getReminder(schoolId, termId);
  }
}
