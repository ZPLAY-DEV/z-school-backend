import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('histories')
export class History {
  @ApiProperty({ description: 'UUID message ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 기본 발송 text() 일땐 학교정보가 없으므로 `전화번호`, send() 일땐 학교명 포함하므로 `학교명#아이디` 조합
  @ApiProperty({
    description: '학교 이름#schoolId, 또는 전화번호',
    example: '대도초등학교#666',
  })
  @Column({ type: 'varchar', length: 48, nullable: true })
  target: string | null;

  @ApiProperty({
    description: '내용',
    example: '알림 내용',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  content: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '알리고에 요청한 알림 갯수' })
  @Column({ type: 'int', unsigned: true })
  smsTotalCount: number;

  @ApiProperty({ description: '알리고에 요청한 알림중 성공 갯수' })
  @Column({ type: 'int', unsigned: true })
  smsSuccessCount: number;

  @ApiProperty({ description: '알리고에 요청한 알림중 실패 갯수' })
  @Column({ type: 'int', unsigned: true })
  smsFailureCount: number;

  @ApiProperty({ description: '알리고에 요청한 사용자ID들' })
  @Column({ type: 'json', nullable: true })
  smsRecipientIds: string[];

  @ApiProperty({ description: 'Firebase에 요청한 알림 갯수' })
  @Column({ type: 'int', unsigned: true })
  fcmTotalCount: number;

  @ApiProperty({ description: 'Firebase에 요청한 알림중 성공 갯수' })
  @Column({ type: 'int', unsigned: true })
  fcmSuccessCount: number;

  @ApiProperty({ description: 'Firebase에 요청한 알림중 실패 갯수' })
  @Column({ type: 'int', unsigned: true })
  fcmFailureCount: number;

  @ApiProperty({ description: 'Firebase에 요청한 사용자ID들' })
  @Column({ type: 'json', nullable: true })
  fcmRecipientIds: string[];

  @ApiProperty({
    description: '그래서 종합적으로 몇개 메시지를 보냈나?',
  })
  @Column({ type: 'int', unsigned: true })
  total: number;

  @ApiProperty({ description: '🈳 비고', example: '비고 내용' })
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
