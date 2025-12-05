import { ApiProperty } from '@nestjs/swagger';
import { IStoryQuestion } from 'src/common/interfaces';
import { Week } from 'src/domain/week/entities/week.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stories')
export class Story {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 weekId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  weekId: number;

  @ApiProperty({ description: '🈵 주차수', example: 1 })
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  weekNumber: number;

  @ApiProperty({ description: '🈵 자세이름', example: '이야기 제목' })
  @Column({ type: 'varchar', length: 64 })
  title: string;

  @ApiProperty({ description: '🈵 자세이름', example: '이야기 설명' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: '🈵 자세이름',
    example: '마무리 멘트 in markdown',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  outro: string;

  @ApiProperty({
    description: '🈳 히어로 스토리 질문',
    example: {
      questions: [
        { id: 1, question: '질문1', answer: '답변1' },
        { id: 2, question: '질문2', answer: '답변2' },
      ],
    },
  })
  @Column('json', { nullable: true })
  questions: IStoryQuestion[] | null;

  @ApiProperty({
    description: '🈳 overview 이미지 URL',
    example: 'https://example.com/image.png',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string | null;

  @ApiProperty({
    description: '🈳 overview 오디오 URL',
    example: 'https://example.com/audio.mp3',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  audioUrl: string | null;

  @ApiProperty({
    description: '🈳 storybook 비디오 URL',
    example: 'https://example.com/video.mp4',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  videoUrl: string | null;

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
  @OneToOne(() => Week, (week) => week.story, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'weekId' })
  week: Week;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Story>) {
    Object.assign(this, partial);
  }
}
