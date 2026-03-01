import { PartialType } from '@nestjs/mapped-types';
import { CreateOrgPlanDto } from './create-org-plan.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrgPlanDto extends PartialType(CreateOrgPlanDto) {
  @ApiProperty({
    description: 'Plan activation status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
