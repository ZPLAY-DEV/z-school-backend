import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IScores } from 'src/common/interfaces';
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

@Entity('scores')
@Unique(['pickId', 'weekNumber'])
export class Score {
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
    description: '수업 일자 - YYYY-MM-DD 형식',
    example: '2025-09-01',
  })
  @Column({ type: 'date', nullable: true })
  lessonDate: string | null;

  @ApiProperty({
    description: '수업 제목 또는 주제',
    example: '분수의 덧셈 복습',
  })
  @Column({ type: 'varchar', length: 120 })
  title: string;

  @ApiPropertyOptional({
    description: '평가 점수',
    example: {
      game: {
        record1: 92,
        record2: 92,
        record3: 92,
      },
      result: {
        record1: 92,
        record2: 92,
        record3: 92,
      },
      measurement: {
        height: 170,
        weight: 70,
        bmi: 24.2,
      },
    },
  })
  @Column('json', { nullable: true })
  value: IScores | null;

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

  @ManyToOne(() => Pick, (pick) => pick.scores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pickId' })
  pick: Pick;
}
