import { ApiProperty } from '@nestjs/swagger';
import { Curriculum } from 'src/domain/curriculum/entities/curriculum.entity';
import { Week } from 'src/domain/week/entities/week.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('syllabuses')
export class Syllabus {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 slug (고유)', example: 'hero' })
  @Column({ type: 'varchar', length: 32, unique: true })
  slug: string;

  @ApiProperty({ description: '🈵 주차수', example: '몇주차 프로그램' })
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  weekCount: number;

  @ApiProperty({ description: '🈵 커리큘럼명', example: '요가 입문 프로그램' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    description: '🈳 커리큘럼 설명',
    example: '초보자를 위한 요가 기초',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

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

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Week, (week) => week.syllabus, {
    cascade: ['insert', 'update'],
  })
  weeks: Week[];

  //* N-to-M belongsToMany using 1-to-M ------------------------------------ *//

  @OneToMany(() => Curriculum, (curriculum) => curriculum.syllabus)
  curriculums: Curriculum[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Syllabus>) {
    Object.assign(this, partial);
  }
}
