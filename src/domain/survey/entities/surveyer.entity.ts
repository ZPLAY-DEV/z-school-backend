import { ApiProperty } from '@nestjs/swagger';
import { SubsidyStatus } from 'src/common/enums';
import { Student } from 'src/domain/student/entities/student.entity';
import { Survey } from 'src/domain/survey/entities/survey.entity';
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

//? 설문조사 대상자 (학생기준)
@Entity('surveyers')
@Unique(['studentId', 'surveyId'])
export class Surveyer {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: 'schoolId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  schoolId: number;

  @ApiProperty({ description: 'termId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  termId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  studentId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  surveyId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '지원금 금액' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  views: number;

  @ApiProperty({ description: '지원금 금액' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  answers: number;

  @ApiProperty({ description: '지원금 프로그램' })
  @Column({
    type: 'enum',
    enum: SubsidyStatus,
    default: SubsidyStatus.PENDING,
  })
  status: SubsidyStatus;

  @ApiProperty({ description: '비고' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @CreateDateColumn()
  @ApiProperty({ description: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'updatedAt' })
  updatedAt: Date;

  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Student, (student) => student.surveyers)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Survey, (survey) => survey.surveyers)
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Surveyer>) {
    Object.assign(this, partial);
  }
}
