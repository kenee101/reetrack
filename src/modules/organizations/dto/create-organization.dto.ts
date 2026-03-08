import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { NinVerificationDto } from './bvn-verification.dto';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Life Fitness',
  })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiProperty({
    description: 'Organization email',
    example: 'admin@life.com',
  })
  @IsEmail()
  @IsNotEmpty()
  organizationEmail: string;

  @ApiProperty({
    description: 'Organization address',
    example: '123 Main Street, Lagos, Nigeria',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Organization website',
    example: 'https://life.com',
  })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Organization phone number',
    example: '+2348012345678',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Organization description',
    example: 'Premium fitness center with state-of-the-art equipment',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Admin NIN verification details',
    type: NinVerificationDto,
  })
  @IsNotEmpty()
  ninVerification: NinVerificationDto;
}
