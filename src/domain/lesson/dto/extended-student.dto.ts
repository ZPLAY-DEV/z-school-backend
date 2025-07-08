import { Student } from 'src/domain/student/entities/student.entity';

export interface ExtendedStudent extends Omit<Student, 'picks'> {
  groupName: string;
  groupStart: string;
}
