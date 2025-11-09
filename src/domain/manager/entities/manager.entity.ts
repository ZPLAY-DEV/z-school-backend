import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Affiliation } from './affiliation.entity';

@Entity('managers')
export class Manager {
  @ApiProperty({ description: 'primary key' })
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 userId' })
  @Column({ type: 'int', unique: true, unsigned: true, nullable: true })
  userId: number | null;

  @ApiProperty({ description: '🈳 관리자 이름' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null;

  @ApiProperty({ description: '🈳 미리 허가받은 전화번호' })
  @Column({ type: 'varchar', length: 16, unique: true, nullable: true })
  phone: string | null;

  @ApiProperty({ description: '🈳 내용' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 termsAgreedAt' })
  @Column({ type: 'timestamp', nullable: true })
  termsAgreedAt: Date | null;

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* 1-to-1 belongsTo ----------------------------------------------------- *//

  @OneToOne(() => User, (user) => user.manager, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user?: User;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Affiliation, (affiliation) => affiliation.manager, {
    cascade: true,
  })
  affiliations?: Affiliation[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Manager>) {
    Object.assign(this, partial);
  }
}
