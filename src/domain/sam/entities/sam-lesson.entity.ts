import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sam_lesson')
@Unique(['samId', 'lessonId'])
export class SamLesson {
  @ApiProperty({ description: 'samLessonId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: 'samId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  samId: number;

  @ApiProperty({ description: 'lessonId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  lessonId: number;

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Sam, (sam) => sam.samLessons)
  @JoinColumn({ name: 'samId' })
  sam: Sam;

  @ManyToOne(() => Lesson, (lesson) => lesson.samLessons)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}
