import { ApiProperty } from '@nestjs/swagger';
import { LedgerType } from 'src/common/enums';
import { School } from 'src/domain/school/entities/school.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('statements')
export class Statement {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 schoolId' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  //* ---------------------------------------------------------------------- *//

  @ApiProperty({ description: '🈳 description' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @ApiProperty({ description: '🈵 금액' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  amount: number;

  @ApiProperty({ description: '🈵 LedgerType' })
  @Column({ type: 'enum', enum: LedgerType, default: LedgerType.CREDIT })
  type: LedgerType;

  @ApiProperty({ description: '🈵 금액' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  balance: number;

  @ApiProperty({
    description:
      '🈳 금액의 상세내역, 예시: { "book": 1000, "material": 2000, "etc": 3000 }',
  })
  @Column('json', { nullable: true })
  breakdown: Record<string, number> | null;

  //* ---------------------------------------------------------------------- *//

  @Column({ type: 'datetime', nullable: true })
  notifiedAt: Date | null;

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* ---------------------------------------------------------------------- *//
  //* M-to-1 belongsTo

  @ManyToOne(() => School, (school) => school.statements, {
    onDelete: 'CASCADE',
  })
  school: School;
}
