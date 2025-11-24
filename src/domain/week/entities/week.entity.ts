import { ApiProperty } from '@nestjs/swagger';
import { Program } from 'src/domain/program/entities/program.entity';
import { Story } from 'src/domain/story/entities/story.entity';
import { Syllabus } from 'src/domain/syllabus/entities/syllabus.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('weeks')
export class Week {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 syllabusId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  syllabusId: number;

  @ApiProperty({ description: '🈵 주차', example: 1 })
  @Column({ type: 'tinyint', unsigned: true })
  weekNumber: number;

  @ApiProperty({ description: '🈵 주제', example: '척추 건강' })
  @Column({ type: 'varchar', length: 100 })
  subject: string;

  @ApiProperty({ description: '🈳 게임', example: '게임명', required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  game: string | null;

  @ApiProperty({
    description: '🈳 게임 상세',
    example: {},
    required: false,
  })
  @Column('json', { nullable: true })
  gameDetail: Record<string, any> | null;

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

  @ApiProperty({
    description: '관련 syllabus',
    type: () => Syllabus,
  })
  @ManyToOne(() => Syllabus, (syllabus) => syllabus.weeks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'syllabusId' })
  syllabus: Syllabus;

  //* 1-to-1 hasOne ------------------------------------------------------- *//

  @OneToOne(() => Story, (story) => story.week, {
    cascade: ['insert', 'update'],
  })
  story: Story;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Program, (program) => program.week, {
    cascade: ['insert', 'update'],
  })
  programs: Program[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Week>) {
    Object.assign(this, partial);
  }
}
