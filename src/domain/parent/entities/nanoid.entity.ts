import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nanoids')
export class NanoId {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: '🈳 로그인 사용자ID' })
  @Column({
    type: 'int',
    unique: true,
    unsigned: true,
  })
  parentId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 nanoId' })
  @Column({ type: 'varchar', length: 32 })
  nanoId: string;

  @ApiProperty({ description: '🈵 전화번호 (숫자만)' })
  @Column({ type: 'varchar', unique: true, length: 16 })
  phone: string;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 expiresAt' })
  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  @Exclude()
  deletedAt: Date | null;

  //* 1-to-1 belongsTo ----------------------------------------------------- *//

  @OneToOne(() => Parent, (parent) => parent.nanoId, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  parent?: Parent;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<NanoId>) {
    Object.assign(this, partial);
  }
}
