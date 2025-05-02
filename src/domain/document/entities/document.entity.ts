import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from 'src/common/enums';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
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

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  instructorId: number;

  // ------------------------------------------------------------------------ //

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.RESUME,
  })
  documentType: DocumentType;

  @Column({ length: 255 })
  url: string;

  // ------------------------------------------------------------------------ //

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

  @ManyToOne(() => Instructor, (instructor) => instructor.documents)
  @JoinColumn({ name: 'instructorId' })
  instructor: Instructor;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Document>) {
    Object.assign(this, partial);
  }
}
