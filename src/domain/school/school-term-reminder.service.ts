import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchoolTermReminderService {
  private readonly logger = new Logger(SchoolTermReminderService.name);

  constructor(
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  async getReminder(schoolId: number, termId: number): Promise<Reminder> {
    console.log('schoolId', schoolId);
    console.log('termId', termId);
    return await this.reminderRepository.findOneOrFail({
      where: {
        schoolId,
        termId,
      },
    });
  }
}
