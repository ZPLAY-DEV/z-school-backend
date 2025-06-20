import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nanoids')
@Unique(['parentId', 'page', 'args'])
export class Nanoid {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: '🈵 로그인하려는 학부모ID' })
  @Column({
    type: 'int',
    unsigned: true,
  })
  parentId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 21자리 나노아이디 값' })
  @Column({ type: 'varchar', length: 32 })
  nanoid: string;

  // @ApiProperty({ description: '🈵 전화번호 (숫자만)' })
  // @Column({ type: 'varchar', length: 16 })
  // phone: string;

  @ApiProperty({ description: '🈵 routing 정보' })
  @Column({ type: 'varchar', nullable: true })
  page: string;

  @ApiProperty({ description: '🈵 routing 부가 args 정보' })
  @Column({ type: 'varchar', nullable: true })
  args: string;

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

  @ManyToOne(() => Parent, (parent) => parent.nanoids, {
    onDelete: 'CASCADE',
  })
  parent: Parent;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Nanoid>) {
    Object.assign(this, partial);
  }
}
