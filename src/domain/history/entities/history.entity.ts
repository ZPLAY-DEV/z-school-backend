import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('histories')
export class History {
  @ApiProperty({ description: 'messageId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '학생 ID', example: 1 })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @ApiProperty({ description: '과목 ID', example: 1 })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'sms Id' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  smsId: string | null;

  @ApiProperty({ description: 'fcm Id' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  fcmId: string | null;

  @ApiProperty({ description: 'kakao Id' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  kakaoId: string | null;

  @ApiProperty({ description: 'message count' })
  @Column({ type: 'int', unsigned: true })
  smsCount: number;

  @ApiProperty({ description: 'message count' })
  @Column({ type: 'int', unsigned: true })
  fcmCount: number;

  @ApiProperty({ description: 'message count' })
  @Column({ type: 'int', unsigned: true })
  kakaoCount: number;

  @ApiProperty({ description: 'total message count' })
  @Column({ type: 'int', unsigned: true })
  total: number;

  @ApiProperty({ description: '🈳 비고', example: '입력한 참고사항' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt: Date;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<History>) {
    Object.assign(this, partial);
  }
}
