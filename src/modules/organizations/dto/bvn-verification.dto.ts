import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class BVNVerificationDto {
  @ApiProperty({
    description: 'Bank Verification Number (BVN)',
    example: '12345678901',
  })
  @IsString()
  @IsNotEmpty()
  bvn: string;
}

export class BVNVerificationResponseDto {
  @ApiProperty({
    description: 'Verification status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Verification message',
    example: 'BVN verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Verified user data',
    example: {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-01-01',
      gender: 'Male',
    },
  })
  data?: any;
}
