import { ApiProperty } from '@nestjs/swagger';
import { GroupStatus } from 'src/common/enums';
import { ITimeRange } from 'src/common/interfaces';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { StudentGroup } from 'src/domain/student/entities/student-group.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Group 보단 Class 가 더 적합하겠지만, Class 는 reserved keyword 이므로 탈락
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 exclusively exists in instructor' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  instructorId: number;

  @ApiProperty({ description: '🈳 exclusively exists in lesson' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  lessonId: number;

  //* ---------------------------------------------------------------------- *//

  @ApiProperty({ description: '🈳 반이름' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  lessonName: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  location: string | null;

  @ApiProperty({ description: '🈳 class size' })
  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  capacity: number;

  @ApiProperty({ description: '🈳 allowed grades' })
  @Column('simple-array')
  allowedGrades: number[];

  @ApiProperty({
    description: '수업 시간 정보 (could be multiple)',
    type: 'array',
    isArray: true,
  })
  @Column({ type: 'json' })
  times: ITimeRange[];

  @ApiProperty({ description: '🈵 상태' })
  @Column({
    type: 'enum',
    enum: GroupStatus,
    default: GroupStatus.ACTIVE,
  })
  groupStatus: GroupStatus;

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

  @ManyToOne(() => Instructor, (instructor) => instructor.groups, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'instructorId' })
  instructor: Instructor;

  @ManyToOne(() => Lesson, (lesson) => lesson.groups, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  //* N-to-M belongsToMany with custom props using 1-to-M ------------------ *//

  @OneToMany(() => StudentGroup, (stdGrp) => stdGrp.group)
  studentGroups: Student[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Group>) {
    Object.assign(this, partial);
  }
}
