import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ProviderLog {
  @PrimaryColumn({ type: 'varchar', length: 7 })
  vrm: string;

  @PrimaryColumn({ type: 'bigint' }) // Composite key with VRM : timestamp
  timestamp: number;

  @Column({ type: 'varchar' })
  reqUrl: string;

  @Column({ type: 'varchar' })
  valuationProvider: string;

  @Column({ type: 'int' })
  durationMilliseconds: number;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'varchar' })
  errorMessage?: string | null;
}