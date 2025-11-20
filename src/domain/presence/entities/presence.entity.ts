import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PresenceStatus } from 'src/common/enums';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('presences')
@Unique(['pickId', 'weekNumber'])
export class Presence {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({
    description: 'pickId - 반과 학생을 연결하는 Pick의 고유 식별자',
    example: 10,
  })
  @Column({ type: 'int', unsigned: true })
  pickId: number;

  @ApiProperty({
    description: '주차 - 1부터 시작하는 수업 주차',
    example: 3,
    minimum: 1,
  })
  @Column({ type: 'tinyint', unsigned: true })
  weekNumber: number;

  @ApiPropertyOptional({
    description: '수업 일자 - YYYY-MM-DD 형식의 출석 기준 날짜',
    example: '2025-09-01',
  })
  @Column({ type: 'date', nullable: true })
  lessonDate: string | null;

  @ApiProperty({
    description: '출석 상태',
    enum: PresenceStatus,
    enumName: 'PresenceStatus',
    example: PresenceStatus.PRESENT,
  })
  @Column({
    type: 'enum',
    enum: PresenceStatus,
    default: PresenceStatus.INIT,
  })
  status: PresenceStatus;

  @ApiPropertyOptional({
    description: '메모 - 출결 관련 특이사항',
    example: '10분 지각 후 출석 처리',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @ApiProperty({ description: '생성일자', example: '2025-09-01T09:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '수정일자', example: '2025-09-01T09:30:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '삭제일자 - 소프트 삭제 시각',
    example: null,
  })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Pick, (pick) => pick.presences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pickId' })
  pick: Pick;
}
