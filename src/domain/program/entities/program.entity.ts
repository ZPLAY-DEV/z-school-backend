import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { ExerciseType, StudentLevel } from 'src/common/enums';
import { Week } from 'src/domain/week/entities/week.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('programs')
export class Program {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 weekId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  weekId: number;

  @ApiProperty({ description: '🈵 자세이름', example: '전사 자세' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    description: '🈵 분류',
    enum: ExerciseType,
    example: ExerciseType.MEDITATION,
  })
  @Column({ type: 'enum', enum: ExerciseType })
  type: ExerciseType;

  @ApiProperty({ description: '🈳 태그', example: 'LEG,WAIST' })
  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @ApiProperty({
    description: '🈳 자막 배열',
    example: ['안녕하세요', '오늘은 전사 자세를 배워볼게요'],
  })
  @Column('json', { nullable: true })
  captions: string[] | null;

  @ApiProperty({
    description: '🈵 난이도',
    enum: StudentLevel,
    example: StudentLevel.JUNIOR,
  })
  @Column({ type: 'enum', enum: StudentLevel })
  level: StudentLevel;

  @ApiProperty({
    description: '🈵 점수 측정 여부',
    example: true,
  })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isScorable: boolean;

  @ApiProperty({
    description: '🈳 비디오 URL',
    example: 'https://example.com/video.mp4',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  videoUrl: string | null;

  @ApiProperty({
    description: '🈳 오디오 URL',
    example: 'https://example.com/audio.mp3',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  audioUrl: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt', example: null })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ApiProperty({
    description: '관련 week',
    type: () => Week,
  })
  @ManyToOne(() => Week, (week) => week.programs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'weekId' })
  week: Week;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Program>) {
    Object.assign(this, partial);
  }
}
