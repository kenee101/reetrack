import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Put,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../../common/decorators/organization.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrgRole, PaymentStatus } from 'src/common/enums/enums';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSubaccountDto } from './dto/create-subaccount.dto';
import { PaystackService } from './paystack.service';
import { RolesGuard } from 'src/common/guards/roles.guard';

class PaymentStatusDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Payment status',
    example: PaymentStatus.SUCCESS,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

@Controller('payments')
@ApiBearerAuth('JWT-auth')
@Throttle({ short: { limit: 20, ttl: 60000 } })
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paystackService: PaystackService,
  ) {}

  @ApiOperation({ summary: 'Initialize a payment' })
  @ApiResponse({ status: 200, description: 'Payment initialized successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('/paystack/initialize')
  initializePayment(
    @CurrentUser() user: any,
    @Body() initializePaymentDto: InitializePaymentDto,
  ) {
    return this.paymentsService.initializePayment(
      user.id,
      initializePaymentDto,
    );
  }

  @ApiOperation({ summary: 'Initialize a payment' })
  @ApiResponse({ status: 200, description: 'Payment initialized successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('/paystack/organization/initialize')
  initializeOrganizationPayment(
    @CurrentUser() user: any,
    @CurrentOrganization() organizationId: string,
    @Body() initializePaymentDto: InitializePaymentDto,
  ) {
    return this.paymentsService.initializeOrganizationPayment(
      organizationId,
      initializePaymentDto,
    );
  }

  @ApiOperation({ summary: 'Verify a payment' })
  @ApiResponse({ status: 200, description: 'Payment verified successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('/paystack/verify/:reference')
  verifyPayment(
    @CurrentOrganization() organizationId: string,
    @Param('reference') reference: string,
  ) {
    return this.paymentsService.verifyPayment(organizationId, reference);
  }

  @Roles(OrgRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subaccount' })
  @ApiResponse({ status: 201, description: 'Subaccount created successfully' })
  @Post('paystack/subaccount')
  async createSubaccount(
    @CurrentOrganization() organizationId: string,
    @Body() createSubaccountDto: CreateSubaccountDto,
  ) {
    const subaccount = await this.paymentsService.createSubaccount(
      organizationId,
      createSubaccountDto,
    );
    return {
      success: true,
      message: 'Subaccount created successfully',
      data: subaccount,
    };
  }

  @Roles(OrgRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subaccount' })
  @ApiResponse({ status: 200, description: 'Subaccount updated successfully' })
  @Put('paystack/subaccounts')
  async updateSubaccount(
    @CurrentOrganization() organizationId: string,
    @Body() updateData: Partial<CreateSubaccountDto>,
  ) {
    const subaccount = await this.paymentsService.updateSubaccount(
      organizationId,
      updateData,
    );
    return {
      success: true,
      message: 'Subaccount updated successfully',
      data: subaccount,
    };
  }

  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get()
  findAll(
    @CurrentOrganization() organizationId: string,
    @Query() paginationDto: PaymentStatusDto,
  ) {
    return this.paymentsService.findAll(
      organizationId,
      paginationDto,
      paginationDto.status,
    );
  }

  @Roles(OrgRole.ADMIN, OrgRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a manual payment record' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('other')
  async createManualPayment(
    @CurrentOrganization() organizationId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.createManualPayment(
      organizationId,
      createPaymentDto,
    );
  }

  @ApiOperation({ summary: 'Get payment stats' })
  @ApiResponse({
    status: 200,
    description: 'Payment stats retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('stats')
  getStats(@CurrentOrganization() organizationId: string) {
    return this.paymentsService.getMemberPaymentStats(organizationId);
  }

  @ApiOperation({ summary: 'Get member payments' })
  @ApiResponse({
    status: 200,
    description: 'Member payments retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('member')
  getMemberPayments(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.paymentsService.getPaymentsByMember(user.id, paginationDto);
  }

  @ApiOperation({ summary: 'Get a payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get(':paymentId')
  findOne(@CurrentUser() user: any, @Param('paymentId') paymentId: string) {
    return this.paymentsService.findOne(user.id, paymentId);
  }
}
