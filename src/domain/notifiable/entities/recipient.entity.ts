import { ApiProperty } from '@nestjs/swagger';
import { Notifiable } from 'src/domain/notifiable/entities/notifiable.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('recipients')
@Unique(['notifiableId', 'studentId'])
@Unique(['nanoid'])
export class Recipient {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: 'notifiableId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  notifiableId: number;

  @ApiProperty({ description: 'studentId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  studentId: number;

  // ------------------------------------------------------------------------ //
  // Shortlink
  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 21자리 나노아이디 값' })
  @Column({ type: 'varchar', length: 32 })
  nanoid: string;

  @ApiProperty({
    description: '🈳 개인화 컨텍스트 (라우팅에 필요한 추가 정보)',
    example: { studentId: 123, groupId: 456 },
  })
  @Column({
    type: 'json',
    nullable: true,
    comment: '개인화 컨텍스트 (라우팅에 필요한 추가 정보)',
  })
  context: {
    studentId?: number;
    groupId?: number;
    lessonId?: number;
    offeringId?: number;
    [key: string]: any;
  } | null;

  // ------------------------------------------------------------------------ //
  // Delivery Tracking
  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈳 발송 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '발송 시각' })
  sentAt: Date | null;

  @ApiProperty({
    description: '🈳 발송 실패 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '발송 실패 시각' })
  failedAt: Date | null;

  @ApiProperty({ description: '🈳 발송 실패 사유' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  errorMessage: string | null;

  // ------------------------------------------------------------------------ //
  // Read Tracking
  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 열람 여부' })
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @ApiProperty({
    description: '🈳 열람 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '열람 시각' })
  readAt: Date | null;

  @ApiProperty({
    description: '🈳 응답 완료 시각 (Survey 전용)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '응답 완료 시각 (Survey)',
  })
  answeredAt: Date | null;

  // ------------------------------------------------------------------------ //
  // Timestamps
  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Notifiable, (notifiable) => notifiable.recipients)
  @JoinColumn({ name: 'notifiableId' })
  notifiable: Notifiable;

  @ManyToOne(() => Student, (student) => student.recipients)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Recipient>) {
    Object.assign(this, partial);
  }
}
