import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Letter } from 'src/domain/letter/entities/letter.entity';
import { NanoId } from 'src/domain/parent/entities/nanoid.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
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

  @OneToOne(() => NanoId, (nanoId) => nanoId.parent, {
    cascade: ['insert', 'update'],
  })
  nanoIds?: NanoId[];

  //* N-to-M manyToMany ---------------------------------------------------- *//
  @ManyToMany(() => Letter, (letter) => letter.parents)
  letters: Letter[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Parent>) {
    Object.assign(this, partial);
  }
}
