import { ApiProperty } from '@nestjs/swagger';
import { Curriculum } from 'src/domain/curriculum/entities/curriculum.entity';
import { Program } from 'src/domain/program/entities/program.entity';
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

  @ApiProperty({ description: '🈵 커리큘럼명', example: '요가 입문 커리큘럼' })
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

  @OneToMany(() => Program, (program) => program.syllabus, {
    cascade: ['insert', 'update'],
  })
  programs: Program[];

  //* N-to-M belongsToMany using 1-to-M ------------------------------------ *//

  @OneToMany(() => Curriculum, (curriculum) => curriculum.syllabus)
  curricula: Curriculum[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Syllabus>) {
    Object.assign(this, partial);
  }
}
