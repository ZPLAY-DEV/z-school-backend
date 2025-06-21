import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
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

@Entity('shortlinks')
export class Shortlink {
  @ApiProperty({ description: 'shortlinkId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({
    description: 'parentId',
    example: 1,
  })
  @Column({ type: 'int', unsigned: true })
  parentId: number;

  @ApiProperty({
    description: 'newsletterId',
    example: 1,
  })
  @Column({ type: 'int', unsigned: true })
  newsletterId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 21자리 나노아이디 값' })
  @Column({ type: 'varchar', length: 32 })
  nanoid: string;

  @ApiProperty({ description: '🈵 routing 정보' })
  @Column({ type: 'varchar', nullable: true })
  page: string;

  @ApiProperty({ description: '🈵 routing 부가 args 정보' })
  @Column({ type: 'varchar', nullable: true })
  args: string;

  @ApiProperty({ description: '🈳 비고', example: '비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ------------------------------------------------------- *//

  @ManyToOne(() => Parent, (parent) => parent.shortlinks)
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @ManyToOne(() => Newsletter, (newsletter) => newsletter.shortlinks)
  @JoinColumn({ name: 'newsletterId' })
  newsletter: Newsletter;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Shortlink>) {
    Object.assign(this, partial);
  }
}
