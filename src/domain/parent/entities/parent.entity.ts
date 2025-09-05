import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Shortlink } from 'src/domain/newsletter/entities/shortlink.entity';
import { Student } from 'src/domain/student/entities/student.entity';
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

@Entity('parents')
export class Parent {
  @ApiProperty({ description: 'parentId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: '🈳 userId', example: 1 })
  @Column({
    type: 'int',
    unique: true,
    unsigned: true,
    default: null,
  })
  userId: number | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 이름', example: '홍길동' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null;

  @ApiProperty({ description: '🈵 전화번호 (숫자만)', example: '01012345678' })
  @Column({ type: 'varchar', unique: true, length: 16 })
  phone: string;

  @ApiProperty({ description: '🈳 비고', nullable: true, example: '비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @ApiProperty({ description: '🈳 termsAgreedAt', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  termsAgreedAt: Date | null;

  // ------------------------------------------------------------------------ //

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

  @OneToOne(() => User, (user) => user.parent, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user?: User;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Student, (student) => student.parent, {
    cascade: ['insert', 'update'],
  })
  students: Student[];

  @OneToMany(() => Shortlink, (shortlink) => shortlink.parent, {
    cascade: ['insert', 'update'],
  })
  shortlinks: Shortlink[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Parent>) {
    Object.assign(this, partial);
  }
}
