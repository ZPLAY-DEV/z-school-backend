import { Module } from '@nestjs/common';
import { SchoolCoreModule } from './modules/school-core.module';
import { SchoolTermModule } from './modules/school-term.module';
import { SchoolStudentModule } from './modules/school-student.module';
import { SchoolBoardModule } from './modules/school-board.module';
import { SchoolResourceModule } from './modules/school-resource.module';

@Module({
  imports: [
    SchoolCoreModule,
    SchoolTermModule,
    SchoolStudentModule,
    SchoolBoardModule,
    SchoolResourceModule,
  ],
  exports: [
    SchoolCoreModule,
    SchoolTermModule,
    SchoolStudentModule,
    SchoolBoardModule,
    SchoolResourceModule,
  ],
})
export class SchoolModule {}
