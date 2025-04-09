import { ApiProperty } from '@nestjs/swagger';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
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

@Entity('terms')
@Unique(['schoolId', 'schoolYear', 'name'])
export class Term {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '학교명' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  schoolName: string | null; // 관리자 편의를 위한 column

  @ApiProperty({ description: '학사년도' })
  @Column({ type: 'int', unsigned: true })
  schoolYear: number; // 학사년도

  @ApiProperty({ description: '늘봄학교 수강기간명' })
  @Column({ type: 'varchar', length: 16 })
  name: string;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @Column({ type: 'varchar', length: 10 })
  started: string;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @Column({ type: 'varchar', length: 10 })
  ended: string;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school) => school.terms)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Lesson, (lesson) => lesson.term)
  lessons: Lesson[];

  //? 날짜 문자열을 Date 객체로 변환하는 getter ----------------------------------- ?//

  get startedAsDate(): Date {
    return new Date(`${this.started}T09:00:00+09:00`); // UTC +9 시간대로 변환
  }

  get endedAsDate(): Date {
    return new Date(`${this.ended}T09:00:00+09:00`); // UTC +9 시간대로 변환
  }

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Term>) {
    Object.assign(this, partial);
  }
}
