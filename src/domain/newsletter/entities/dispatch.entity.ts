import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { NewsletterTarget } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
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

//! notification target plus schedule

@Entity('dispatches')
export class Dispatch {
  @ApiProperty({ description: 'dispatchId' })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 SchoolId' })
  @Column({ type: 'int', unsigned: true })
  newsletterId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈵 발송대상자 리스트. 발송하려면 deduped studentIds 필요',
    example: [1, 2, 3],
  })
  @Column({
    type: 'simple-array',
    comment: '발송대상자 리스트. 발송하려면 deduped studentIds 필요',
    nullable: true,
  })
  studentIds: number[] | null;

  @ApiProperty({
    description: '🈵 발송 대상 유형; SCHOOL, GRADE, LESSON, GROUP, STUDENT',
    example: NewsletterTarget.SCHOOL,
  })
  @Column({
    type: 'enum',
    enum: NewsletterTarget,
    default: NewsletterTarget.SCHOOL,
    nullable: true,
  })
  target: NewsletterTarget | null;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({
    type: 'simple-array',
    comment: '대상별 아이템 아이디',
    nullable: true,
  })
  targetItems: number[] | null;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  targetLabel: string | null;

  @ApiProperty({ description: '🈵 notification service 에 전달할 payload' })
  @Column({ type: 'json', nullable: true })
  payload: {
    type: string;
    schoolId: number;
    role: string;
    messages: any[];
  } | null;

  @ApiProperty({
    description: '🈳 발송예약 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '발송예약 시각' })
  scheduledAt: Date | null;

  @ApiProperty({ description: '🈵 발송 상태' })
  @Column({
    type: 'enum',
    enum: SendStatus,
    default: SendStatus.INIT,
  })
  status: SendStatus;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt', nullable: true })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(
    () => Newsletter,
    (newsletter: Newsletter) => newsletter.dispatches,
  )
  @JoinColumn({ name: 'newsletterId' })
  newsletter: Newsletter;

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Dispatch>) {
    Object.assign(this, partial);
  }
}
