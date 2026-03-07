import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class NinVerificationDto {
  @ApiProperty({
    description: 'National Identification Number (NIN)',
    example: '12345678901',
  })
  @IsString()
  @IsNotEmpty()
  nin: string;
}

export class NinVerificationResponseDto {
  @ApiProperty({
    description: 'Verification status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Verification message',
    example: 'NIN verified successfully',
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
