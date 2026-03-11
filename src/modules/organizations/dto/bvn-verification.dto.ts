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

  @ApiProperty({
    description: 'First name',
    example: 'James',
  })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    description: 'Date of birth (YYYY-MM-DD)',
    example: '1990-01-01',
  })
  @IsNotEmpty()
  @IsString()
  date_of_birth: string;
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
