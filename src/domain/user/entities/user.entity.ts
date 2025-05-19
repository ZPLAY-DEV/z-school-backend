import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';
import { Board } from 'src/domain/board/entities/board.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Comment } from 'src/domain/board/entities/comment.entity';
import { Provider } from 'src/domain/user/entities/provider.entity';
import { Token } from 'src/domain/user/entities/token.entity';
import { Withdrawal } from 'src/domain/user/entities/withdrawal.entity';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true })
  @ApiProperty({ description: '🈵 username' })
  username: string;

  @Column({ type: 'varchar', length: 32, unique: true, nullable: true })
  @ApiProperty({ description: '🈳 phone' })
  phone: string | null;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  @ApiProperty({ description: '🈳 email' })
  email: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Exclude()
  @ApiProperty({ description: '🈵 password' })
  password: string;

  // @Column({ type: 'enum', enum: Gender, nullable: true })
  // @ApiProperty({ description: '성별' })
  // gender: Gender | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: DEFAULT_AVATAR_URL,
  })
  @ApiProperty({ description: '🈳 avatar' })
  avatar: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: '🈳 pushToken' })
  pushToken: string | null;

  // ------------------------------------------------------------------------ //

  @CreateDateColumn()
  @ApiProperty({ description: '🈵 createdAt' })
  createdAt: Date;

  @UpdateDateColumn()
  @Exclude()
  @ApiProperty({ description: '🈵 updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn()
  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt' })
  deletedAt: Date | null;

  //* 1-to-1 hasOne -------------------------------------------------------- *//

  @Exclude()
  @OneToOne(() => Instructor, (instructor) => instructor.user, {
    cascade: ['insert', 'update'],
  })
  instructor?: Instructor;

  @Exclude()
  @OneToOne(() => Manager, (manager) => manager.user, {
    cascade: ['insert', 'update'],
  })
  manager?: Manager;

  @Exclude()
  @OneToOne(() => Parent, (parent) => parent.user, {
    cascade: ['insert', 'update'],
  })
  parent?: Parent;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @Exclude()
  @OneToMany(() => Token, (token) => token.user, {
    cascade: ['insert', 'update'],
  })
  tokens: Token[];

  @Exclude()
  @OneToMany(() => Provider, (provider) => provider.user, {
    cascade: ['insert', 'update'],
  })
  providers: Provider[];

  // @Exclude()
  // @OneToMany(() => Post, (post) => post.user, {
  //   cascade: ['insert', 'update'],
  // })
  // posts: Post[];

  @Exclude()
  @OneToMany(() => Board, (board) => board.user, {
    cascade: ['insert', 'update'],
  })
  boards: Board[];

  @Exclude()
  @OneToMany(() => Comment, (comment) => comment.user, {
    cascade: ['insert', 'update'],
  })
  comments: Comment[];

  @Exclude()
  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.user)
  withdrawals: Withdrawal[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
