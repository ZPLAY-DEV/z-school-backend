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
import { Dispatch } from './dispatch.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

/**
 * @todo many-to-many 관계로 라이트하게 구조 변경
 * 읽었을 때, 해당 필드값을 제거하는 형식으로 변경.
 */
@Entity('dispatch_read')
@Unique(['parentId', 'dispatchId'])
export class DispatchRead {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '🈳 Parent ID' })
  @Column({ type: 'int', unsigned: true })
  parentId: number;

  @ApiProperty({ description: '🈳 Dispatch ID' })
  @Column({ type: 'int', unsigned: true })
  dispatchId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  @Exclude()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Parent, (parent) => parent.dispatchReads)
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @ManyToOne(() => Dispatch, (dispatch) => dispatch.dispatchReads)
  @JoinColumn({ name: 'dispatchId' })
  dispatch: Dispatch;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<DispatchRead>) {
    Object.assign(this, partial);
  }
}
