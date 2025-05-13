import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Role } from 'src/common/enums';
import { Board } from 'src/domain/board/entities/board.entity';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('comments')
@Unique(['userId', 'boardId'])
export class Comment {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 작성자 User ID' })
  @Column({ type: 'int', unsigned: true })
  userId: number;

  @ApiProperty({ description: '🈵 연결된 게시글 ID' })
  @Column({ type: 'int', unsigned: true })
  boardId: number;

  @ApiProperty({ description: '🈳 부모 댓글 ID (답글인 경우)', nullable: true })
  @Column({ type: 'int', unsigned: true, nullable: true })
  parentId: number | null;

  //* ---------------------------------------------------------------------- *//

  @ApiProperty({ description: '🈵 작성자 유형', enum: Role })
  @Column({ type: 'enum', enum: Role })
  userRole: Role;

  @ApiProperty({ description: '🈳 댓글 내용' })
  @Column({ type: 'text', nullable: true })
  content: string | null;

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

  @ManyToOne(() => Board, (board) => board.comments)
  board: Board;

  @ManyToOne(() => User, (user) => user.comments)
  user: User;

  @ManyToOne(() => Comment, (Comment) => Comment.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Comment;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Comment, (opinion) => opinion.parent)
  children: Comment[];

  // ------------------------------------------------------------------------ //

  constructor(partial: Partial<Comment>) {
    Object.assign(this, partial);
  }
}
