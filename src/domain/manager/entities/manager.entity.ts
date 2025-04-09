import { ApiProperty } from '@nestjs/swagger';
import { PlatformType } from 'src/common/enums';
import { School } from 'src/domain/school/entities/school.entity';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('managers')
export class Manager {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 userId' })
  @Column({
    type: 'int',
    unique: true,
    unsigned: true,
    default: null,
  })
  userId: number | null;

  @ApiProperty({ description: '🈳 schoolId' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 매니저 이름' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null;

  @ApiProperty({ description: '🈵 매니저 전화번호 (숫자만 입력)' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  phone: string | null;

  @ApiProperty({ description: '🈳 마지막 로그인 기기 web, ios, or android' })
  @Column({ type: 'enum', enum: PlatformType, default: null })
  platform: PlatformType | null;

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

  @OneToOne(() => User, (user) => user.manager, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user?: User;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school) => school.managers, {
    onDelete: 'CASCADE',
  })
  school: School;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Manager>) {
    Object.assign(this, partial);
  }
}
