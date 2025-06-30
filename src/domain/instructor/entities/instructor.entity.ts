import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Sam } from 'src/domain/sam/entities/sam.entity';
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

@Entity('instructors')
export class Instructor {
  @ApiProperty({ description: 'instructorId' })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 로그인 사용자ID' })
  @Column({
    type: 'int',
    unique: true,
    unsigned: true,
    default: null,
  })
  userId: number | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 강사 이름' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null;

  @ApiProperty({ description: '🈵 강사 전화번호 (숫자만 입력)' })
  @Column({ type: 'varchar', length: 16, unique: true })
  phone: string;

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

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* 1-to-1 belongsTo ----------------------------------------------------- *//

  @OneToOne(() => User, (user) => user.instructor, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user?: User;

  //* 1-to-M hasMany -------------------- ---------------------------------- *//

  @OneToMany(() => Sam, (sam) => sam.instructor, {
    cascade: ['insert', 'update'],
  })
  sams: Sam[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Instructor>) {
    Object.assign(this, partial);
  }
}
