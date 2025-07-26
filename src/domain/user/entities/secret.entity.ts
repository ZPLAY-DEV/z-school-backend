import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('secrets')
export class Secret {
  @ApiProperty({ description: 'secretId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  // apply unique constraint there
  @ApiProperty({ description: 'key', example: '01094867415' })
  @Column({ type: 'varchar', length: 64, unique: true })
  key: string;

  @ApiProperty({ description: 'otp', example: '1234' })
  @Column({ type: 'varchar', length: 8, nullable: true })
  otp: string | null;

  @ApiProperty({ description: 'role', example: 'PARENT' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  role: 'PARENT' | 'INSTRUCTOR' | null;

  @ApiProperty({ description: 'entityName', example: 'user' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  entityName: string | null;

  @ApiProperty({ description: 'entityId', example: '1234567890' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  entityId: string | null;

  // ------------------------------------------------------------------------ //

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Secret>) {
    Object.assign(this, partial);
  }
}
