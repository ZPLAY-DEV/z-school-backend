import { ApiProperty } from '@nestjs/swagger';
import { SubsidyStatus, SubsidyType } from 'src/common/enums';
import { Student } from 'src/domain/student/entities/student.entity';
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

@Entity('subsidies')
export class Subsidy {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  studentId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '지원금 금액' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  amount: number;

  @ApiProperty({ description: '지원금 지급주체' })
  @Column({ type: 'varchar', length: 32 })
  source: string;

  @ApiProperty({ description: '지원금 프로그램' })
  @Column({
    type: 'enum',
    enum: SubsidyType,
    default: SubsidyType.BASIC_EDUCATION_RECIPIENT,
  })
  type: SubsidyType;

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

  @ManyToOne(() => Student, (student) => student.subsidies)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Subsidy>) {
    Object.assign(this, partial);
  }
}
