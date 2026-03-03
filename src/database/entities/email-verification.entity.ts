import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('email_verifications')
@Index(['email', 'otp'])
export class EmailVerification {
  @ApiProperty({
    description: 'Verification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @Column({ type: 'text' })
  email: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @Column({ type: 'text' })
  otp: string;

  @ApiProperty({
    description: 'OTP expiration time',
    example: '2023-01-01T00:10:00.000Z',
  })
  @Column({ type: 'timestamp with time zone' })
  expires_at: Date;

  @ApiProperty({
    description: 'Whether OTP has been used',
    example: false,
  })
  @Column({ type: 'boolean', default: false })
  is_used: boolean;

  @ApiProperty({
    description: 'Number of attempts made',
    example: 0,
  })
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @ApiProperty({
    description: 'Created at',
    example: '2023-01-01T00:00:00.000Z',
  })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({
    description: 'Updated at',
    example: '2023-01-01T00:00:00.000Z',
  })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @ManyToOne(() => User, { nullable: true })
  user: User;
}
