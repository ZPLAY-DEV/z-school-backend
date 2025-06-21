import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
@Entity('providers')
@Unique(['providerName', 'providerId'])
export class Provider {
  @ApiProperty({ description: 'providerId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: 'userId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  userId: number; // to make it available to Repository.

  @ApiProperty({ description: 'providerName', example: 'google' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  providerName: string | null;

  @ApiProperty({ description: 'providerId', example: '1234567890' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  providerId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //* ---------------------------------------------------------------------- *//
  //* many-to-1 belongsTo

  @ManyToOne(() => User, (user) => user.providers, {
    // delete this as well when user is being deleted
    onDelete: 'CASCADE',
  })
  user: User;

  //? ---------------------------------------------------------------------- ?//
  //? constructor

  constructor(partial: Partial<Provider>) {
    Object.assign(this, partial);
  }
}
