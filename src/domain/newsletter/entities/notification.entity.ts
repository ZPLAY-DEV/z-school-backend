import { ApiProperty } from '@nestjs/swagger';
import { IFcmData } from 'src/common/interfaces';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';

//! notification target plus schedule

@Entity('notifications')
export class Notification {
  @ApiProperty({ description: 'notification id' })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({
    description: 'newsletterId',
    example: 1,
  })
  @Column({ type: 'int', unsigned: true })
  newsletterId: number;

  @ApiProperty({ description: '🈵 body' })
  @Column({ type: 'varchar', length: 16 })
  phone: string;

  @ApiProperty({ description: '🈵 body' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  token: string | null;

  @ApiProperty({ description: '🈵 body' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: '🈵 body' })
  @Column({ type: 'varchar', length: 255 })
  body: string;

  @ApiProperty({ description: '🈵 notification service 에 전달할 payload' })
  @Column({ type: 'json', nullable: true })
  data: IFcmData | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(
    () => Newsletter,
    (newsletter: Newsletter) => newsletter.notifications,
  )
  @JoinColumn({ name: 'newsletterId' })
  newsletter: Newsletter;

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Notification>) {
    Object.assign(this, partial);
  }
}
