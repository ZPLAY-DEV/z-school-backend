import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { LedgerType } from 'src/common/enums';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ApiTags('⚠️ Ledgers ( 학생비용내역 )')
@Entity('ledgers')
export class Ledger {
  @ApiProperty({ description: 'primary key' })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true })
  studentId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true })
  lessonId: number;

  //* ---------------------------------------------------------------------- *//

  @ApiProperty({ description: '' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @ApiProperty({ description: '금액' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  amount: number;

  @ApiProperty({ description: 'LedgerType' })
  @Column({ type: 'enum', enum: LedgerType, default: LedgerType.CREDIT })
  ledgerType: LedgerType;

  @ApiProperty({ description: '금액' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  balance: number;

  @ApiProperty({
    description:
      '금액의 상세내역, 예시: { "book": 1000, "material": 2000, "etc": 3000 }',
  })
  @Column('json', { nullable: true })
  breakdown: Record<string, number> | null;

  //* ---------------------------------------------------------------------- *//

  // @Column({ type: 'datetime', nullable: true })
  // notifiedAt: Date | null;

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* ---------------------------------------------------------------------- *//
  //* M-to-1 belongsTo

  @ManyToOne(() => Student, (student) => student.ledgers, {
    onDelete: 'CASCADE',
  })
  student: Student;

  @ManyToOne(() => Lesson, (lesson) => lesson.ledgers, {
    onDelete: 'CASCADE',
  })
  lesson: Lesson;
}
