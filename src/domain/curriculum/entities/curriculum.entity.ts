import { ApiProperty } from '@nestjs/swagger';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Syllabus } from 'src/domain/syllabus/entities/syllabus.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('curriculums')
@Unique(['lessonId', 'syllabusId'])
export class Curriculum {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 lessonId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  lessonId: number;

  @ApiProperty({ description: '🈵 syllabusId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  syllabusId: number;

  @ApiProperty({ description: '🈵 termId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  termId: number;

  @ApiProperty({ description: '🈵 schoolId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  schoolId: number; // 관리자 편의를 위한 Column.

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Lesson, (lesson) => lesson.curriculums, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => Syllabus, (syllabus) => syllabus.curriculums, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'syllabusId' })
  syllabus: Syllabus;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Curriculum>) {
    Object.assign(this, partial);
  }
}
