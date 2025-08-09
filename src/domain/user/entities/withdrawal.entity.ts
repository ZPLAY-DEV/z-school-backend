import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/common/enums';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
@Entity('withdrawals')
@Unique(['userId'])
export class Withdrawal {
  @ApiProperty({ description: 'withdrawalId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: 'userId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  userId: number | null; // to make it available to Repository.

  @ApiProperty({ description: '🈵 role' })
  @Column({
    type: 'enum',
    enum: Role,
    default: Role.PARENT,
  })
  role: Role;

  @ApiProperty({ description: 'reason to quit' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //? ---------------------------------------------------------------------- ?//
  //? many-to-1 belongsTo

  @ManyToOne(() => User, (user) => user.withdrawals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user?: User;

  //? ---------------------------------------------------------------------- ?//
  //? constructor

  constructor(partial: Partial<Withdrawal>) {
    Object.assign(this, partial);
  }
}
