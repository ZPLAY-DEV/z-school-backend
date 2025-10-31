import { ApiProperty } from '@nestjs/swagger';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Syllabus } from 'src/domain/syllabus/entities/syllabus.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('curriculums')
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

  @ApiProperty({
    description: '🈳 학교명',
    example: '홍익대학교 사범대학 부속 초등학교',
  })
  @Column({ type: 'varchar', length: 24, nullable: true })
  schoolName: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt', example: null })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Lesson, (lesson) => lesson.curricula, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => Syllabus, (syllabus) => syllabus.curricula, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'syllabusId' })
  syllabus: Syllabus;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Curriculum>) {
    Object.assign(this, partial);
  }
}
