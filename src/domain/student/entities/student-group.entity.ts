import { ApiProperty } from '@nestjs/swagger';
import { Group } from 'src/domain/group/entities/group.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('student_group')
export class StudentGroup {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  studentId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  groupId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '이 학생의 정확한 교재비' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  bookFee: number | null;

  @ApiProperty({ description: '이 학생의 정확한 재료비' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  materialFee: number | null;

  @ManyToOne(() => Student, (student) => student.studentGroups)
  student: Student;

  @ManyToOne(() => Group, (group) => group.studentGroups)
  group: Group;
}
