import { ApiProperty } from '@nestjs/swagger';
import { School } from 'src/domain/school/entities/school.entity';
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
import { Manager } from './manager.entity';

@Entity('affiliations')
@Unique(['managerId', 'schoolId'])
export class Affiliation {
  @ApiProperty({ description: 'primary key' })
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 managerId' })
  @Column({ type: 'int', unsigned: true })
  managerId: number;

  @ApiProperty({ description: '🈵 schoolId' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @ApiProperty({ description: '🈳 학교 이름 (캐시용)' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  schoolName: string | null;

  @ApiProperty({ description: '🈳 관리자 역할 설명' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @ApiProperty({ description: '🈳 활성화 상태' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Manager, (manager) => manager.affiliations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'managerId' })
  manager: Manager;

  @ManyToOne(() => School, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Affiliation>) {
    Object.assign(this, partial);
  }
}
