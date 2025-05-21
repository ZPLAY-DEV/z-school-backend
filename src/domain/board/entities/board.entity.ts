import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { User } from 'src/domain/user/entities/user.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Comment } from 'src/domain/board/entities/comment.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsArray } from 'class-validator';
import { School } from 'src/domain/school/entities/school.entity';

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 작성자 User ID' })
  @Column({ type: 'int', unsigned: true })
  userId: number;

  @ApiProperty({ description: '🈵 Group ID' })
  @Column({ type: 'int', unsigned: true })
  groupId: number;

  @ApiProperty({ description: '🈵 학교ID' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 게시글 제목' })
  @Column({ type: 'varchar', length: 64 })
  title: string;

  @ApiProperty({ description: '🈳 게시글 본문' })
  @Column({ type: 'text', default: null, nullable: true })
  body: string | null;

  @ApiProperty({ description: '🈳 첨부 파일 URL', nullable: true })
  @Column('json', { nullable: true })
  @IsArray()
  images: string[] | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt', nullable: true })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => User, (user: User) => user.boards)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Group, (group: Group) => group.boards)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => School, (school: School) => school.boards)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Comment, (comment: Comment) => comment.board)
  comments: Comment[];

  // ------------------------------------------------------------------------ //

  constructor(partial: Partial<Board>) {
    Object.assign(this, partial);
  }
}
