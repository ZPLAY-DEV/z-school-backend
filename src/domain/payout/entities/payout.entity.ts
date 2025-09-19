import { ApiProperty } from '@nestjs/swagger';
import { LedgerType } from 'src/common/enums';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payouts')
export class Payout {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 samId' })
  @Column({ type: 'int', unsigned: true })
  samId: number;

  @ApiProperty({ description: '🈵 contractId' })
  @Column({ type: 'int', unsigned: true })
  contractId: number;

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

  //* ---------------------------------------------------------------------- *//
  //* M-to-1 belongsTo

  @ManyToOne(() => Contract, (contract) => contract.payouts, {
    onDelete: 'CASCADE',
  })
  contract: Contract;
}
