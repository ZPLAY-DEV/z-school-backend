import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
@Entity('providers')
@Unique(['providerName', 'providerId'])
export class Provider {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  userId: number; // to make it available to Repository.

  @Column({ type: 'varchar', length: 16, nullable: true })
  providerName: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //* ---------------------------------------------------------------------- *//
  //* many-to-1 belongsTo

  @ManyToOne(() => User, (user) => user.providers, {
    // delete this as well when user is being deleted
    onDelete: 'CASCADE',
  })
  user: User;

  //? ---------------------------------------------------------------------- ?//
  //? constructor

  constructor(partial: Partial<Provider>) {
    Object.assign(this, partial);
  }
}
