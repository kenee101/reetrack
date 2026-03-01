import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayNotEmpty,
  IsEmail,
  IsString,
  IsObject,
  MinLength,
} from 'class-validator';

export class SendCustomEmailDto {
  @ApiProperty({
    description: 'Recipient email addresses',
    example: ['user1@example.com', 'user2@example.com'],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiProperty({
    description: 'Email subject',
    example: 'Important Update About Your Subscription',
  })
  @IsString()
  @MinLength(1)
  subject: string;

  @ApiProperty({
    description: 'Context variables for the email template',
    example: {
      content: 'Hello, this is a custom email.',
      additionalNotes: 'Please join us for our annual conference.',
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  context: Record<string, any>;
}
