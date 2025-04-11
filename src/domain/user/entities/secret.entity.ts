import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity()
export class Secret {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  // apply unique constraint there
  @Column({ type: 'varchar', length: 64, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  otp: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  entityName: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  entityId: string | null;

  // ------------------------------------------------------------------------ //

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //? Constructor ---------------------------------------------------------- ?//
  constructor(partial: Partial<Secret>) {
    Object.assign(this, partial);
  }
}
