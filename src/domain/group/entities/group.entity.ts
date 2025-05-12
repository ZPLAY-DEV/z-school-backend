import { ApiProperty } from '@nestjs/swagger';
import { ClassStatus, Weekday } from 'src/common/enums';
import { GroupStudent } from 'src/domain/group/entities/group-student.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

// Group 보단 Class 가 더 적합하겠지만, Class 는 reserved keyword 이므로 탈락
@Entity('groups')
@Unique(['lessonId', 'groupName'])
export class Group {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 exclusively exists in instructor' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  instructorId: number;

  @ApiProperty({ description: '🈵 exclusively exists in lesson' })
  @Column({ type: 'int', unsigned: true })
  lessonId: number;

  //* ---------------------------------------------------------------------- *//

  @ApiProperty({ description: '🈵 반이름' })
  @Column({ type: 'varchar', length: 24 })
  groupName: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  location: string | null;

  @ApiProperty({ description: '🈳 class size' })
  @Column({ type: 'int', unsigned: true, default: 20 })
  capacity: number;

  @ApiProperty({ description: '🈳 a comma separated string format' })
  @Column({ type: 'varchar', length: 16 })
  allowedGrades: string;

  @ApiProperty({
    description: '수업 요일',
    enum: Weekday,
    example: Weekday.MONDAY,
  })
  @Column({ type: 'enum', enum: Weekday })
  weekday: Weekday;

  @ApiProperty({ description: '수업 시작 시간 (HH:mm)', example: '14:40' })
  @Column({ type: 'varchar', length: 5 })
  start: string;

  @ApiProperty({ description: '수업 종료 시간 (HH:mm)', example: '15:20' })
  @Column({ type: 'varchar', length: 5 })
  end: string;

  @ApiProperty({ description: '🈵 상태' })
  @Column({
    type: 'enum',
    enum: ClassStatus,
    default: ClassStatus.PENDING,
  })
  status: ClassStatus;

  @ApiProperty({ description: '🈳 비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Instructor, (instructor) => instructor.groups)
  @JoinColumn({ name: 'instructorId' })
  instructor: Instructor;

  @ManyToOne(() => Lesson, (lesson) => lesson.groups)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  //* N-to-M belongsToMany with custom props using 1-to-M ------------------ *//
  @ApiProperty({
    description: '🈳 연결된 학생 목록',
  })
  @OneToMany(() => GroupStudent, (gs) => gs.group)
  groupStudents: GroupStudent[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Group>) {
    Object.assign(this, partial);
  }
}
