import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { PlatformType } from 'src/common/enums';
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
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: '🈳 로그인 사용자ID' })
  @Column({
    type: 'int',
    unique: true,
    unsigned: true,
    default: null,
  })
  userId: number | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 성함' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null;

  @ApiProperty({ description: '🈵 전화번호 (숫자만)' })
  @Column({ type: 'varchar', unique: true, length: 16 })
  phone: string;

  @ApiProperty({ description: '🈳 마지막 로그인 기기 web, ios, or android' })
  @Column({ type: 'enum', enum: PlatformType, default: null })
  platform: PlatformType | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: '🈳 pushToken' })
  pushToken: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @ApiProperty({ description: '🈳 내용' })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 termsAgreedAt' })
  @Column({ type: 'datetime', nullable: true })
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

  @OneToOne(() => User, (user) => user.instructor, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user?: User;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Student, (student) => student.parent, {
    cascade: ['insert', 'update'],
  })
  students: Student[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Parent>) {
    Object.assign(this, partial);
  }
}
