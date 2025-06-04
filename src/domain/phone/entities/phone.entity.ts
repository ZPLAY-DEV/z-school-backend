import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { School } from 'src/domain/school/entities/school.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// 학교별 발신 정보 저장 테이블
@Entity('phones')
export class Phone {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 학교 아이디' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @ApiProperty({ description: '🈵 학교에서 관리하는 발송 번호 (숫자만 입력)' })
  @Column({ type: 'varchar', length: 16 })
  phone: string;

  @ApiProperty({ description: '🈳 발신번호 활성화 상태' })
  @Column({
    type: 'boolean',
    default: false,
    comment: ' 1: 활성화된 번호, 0: 비활성화된 번호',
  })
  isActive: boolean;

  // @ApiProperty({ description: '🈳 학교 이름' })
  // @Column({ type: 'varchar', length: 32, nullable: true })
  // name: string | null;

  // ------------------------------------------------------------------------ //
  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school) => school.calendars, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'schoolId' })
  school: School;
}
