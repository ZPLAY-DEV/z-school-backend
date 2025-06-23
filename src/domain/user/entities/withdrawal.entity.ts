import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('withdrawals')
export class Withdrawal {
  @ApiProperty({ description: 'withdrawalId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: 'userId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  userId: number | null; // to make it available to Repository.

  @ApiProperty({
    description:
      'provider 의 providerId 를 모두 저장하여, 같은 id 가 탈퇴이후 다시 사용되는지 체크하기 위함',
  })
  @Column({ length: 128, unique: true })
  providerId: string;

  @ApiProperty({ description: 'reason to quit' })
  @Column({ type: 'varchar', length: 80, nullable: true })
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
