import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { EnrollmentStatus } from 'src/common/enums/enrollment-status';
import { Group } from 'src/domain/group/entities/group.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('group_student')
export class GroupStudent {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  studentId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  groupId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '이 학생의 정확한 교재비', example: 12000 })
  @Column({ type: 'int', unsigned: true, default: 0 })
  bookFee: number;

  @ApiProperty({ description: '이 학생의 정확한 재료비', example: 8200 })
  @Column({ type: 'int', unsigned: true, default: 0 })
  materialFee: number;

  @ApiProperty({
    description: '🈵 반에 어떻게 들어왔는지',
    default: EnrollmentStatus.REGISTRATION,
  })
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.REGISTRATION,
    comment: '어떻게 반에 들어왔나?',
  })
  status: EnrollmentStatus;

  @ApiProperty({ description: '🈳 비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt; 언제 등록되었는지' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt; 언제 그만 두었는지' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  @ManyToOne(() => Student, (student) => student.groupStudents)
  student: Student;

  @ManyToOne(() => Group, (group) => group.groupStudents)
  group: Group;
}
