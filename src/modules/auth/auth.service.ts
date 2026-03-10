import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Organization } from '../../database/entities/organization.entity';
import { User } from '../../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from '../../common/dto/register.dto';
import { LoginDto } from '../../common/dto/login.dto';
import { MemberRegisterDto } from 'src/common/dto/member-register.dto';
import { Member } from 'src/database/entities';
import { OrganizationUser } from 'src/database/entities/organization-user.entity';
import { OrgRole } from 'src/common/enums/enums';
import { OrganizationInvite } from 'src/database/entities/organization-invite.entity';
import { StaffRegisterDto } from 'src/common/dto/staff-register.dto';
import type { Request, Response } from 'express';
import { UserRegisterDto } from 'src/common/dto/user-register.dto';
import { CustomRegisterDto } from './auth.controller';
import { InvitationsService } from '../invitations/invitations.service';
import { PlanLimitService } from '../plans/plans-limit.service';
import { EmailVerification } from '../../database/entities/email-verification.entity';
import { SendVerificationDto } from './dto/send-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

interface RegisterOrgResponse {
  message: string;
  data: {
    organization: {
      id: string;
      name: string;
      email: string;
    };
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(OrganizationUser)
    private organizationUserRepository: Repository<OrganizationUser>,

    @InjectRepository(OrganizationInvite)
    private organizationInviteRepository: Repository<OrganizationInvite>,

    @InjectRepository(Member)
    private memberRepository: Repository<Member>,

    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,

    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private invitationsService: InvitationsService,
    private planLimitService: PlanLimitService,
  ) {}

  async registerOrganization(
    registerDto: RegisterDto,
  ): Promise<RegisterOrgResponse> {
    // Check if user email exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (!existingUser) {
      throw new NotFoundException(
        'User email not found. Please register an account with us.',
      );
    }

    if (!existingUser.email_verified) {
      throw new BadRequestException(
        'Please verify your email before creating an organization',
      );
    }

    // Check if organization email exists
    const existingOrg = await this.organizationRepository.findOne({
      where: { email: registerDto.organizationEmail },
    });

    if (existingOrg) {
      throw new ConflictException(
        'Organization email already exists. Please use a different email.',
      );
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(registerDto.organizationName);

    // Create organization
    const organization = this.organizationRepository.create({
      name: registerDto.organizationName,
      email: registerDto.organizationEmail,
      slug,
      status: 'active',
    });

    const savedOrg = await this.organizationRepository.save(organization);

    // Create organization_user with ADMIN role
    const orgUser = this.organizationUserRepository.create({
      user_id: existingUser.id,
      organization_id: savedOrg.id,
      role: OrgRole.ADMIN,
      status: 'active',
    });

    const savedOrgUser = await this.organizationUserRepository.save(orgUser);

    // Send welcome email to organization
    await this.notificationsService.sendOrganizationRegisterEmail({
      userEmail: existingUser.email,
      userName: `${existingUser.first_name} ${existingUser.last_name}`,
      organizationName: savedOrg.name,
    });

    return {
      message: 'Organization and admin user created successfully',
      data: {
        organization: {
          id: savedOrg.id,
          name: savedOrg.name,
          email: savedOrg.email,
        },
      },
    };
  }

  async registerMember(memberRegisterDto: MemberRegisterDto) {
    // Find organization by slug
    const organization = await this.organizationRepository.findOne({
      where: { slug: memberRegisterDto.organizationSlug!.toLowerCase() },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!organization.metadata.verified) {
      throw new BadRequestException('Organization is not fully verified');
    }

    // Check if user email exists
    let user = await this.userRepository.findOne({
      where: { email: memberRegisterDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    // Check if already member of this org
    const existingOrgUser = await this.organizationUserRepository.findOne({
      where: {
        user_id: user.id,
        organization_id: organization.id,
      },
    });

    if (existingOrgUser) {
      throw new ConflictException('Already a member of this organization');
    }

    // Create organization_user with MEMBER role
    const orgUser = this.organizationUserRepository.create({
      user_id: user.id,
      organization_id: organization.id,
      role: OrgRole.MEMBER,
      status: 'active',
    });

    const savedOrgUser = await this.organizationUserRepository.save(orgUser);

    const member = this.memberRepository.create({
      user_id: user.id,
      organization_user_id: savedOrgUser.id,
    });

    await this.memberRepository.save(member);

    return {
      message: 'Registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      },
    };
  }

  async customRegisterMember(
    organizationId: string,
    memberRegisterDto: CustomRegisterDto,
  ) {
    // Find organization by id
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Process each email in the array
    const results: {
      email: string;
      status: string;
      userExists: boolean;
    }[] = [];

    for (const email of memberRegisterDto.email) {
      // Check if user email exists
      let user = await this.userRepository.findOne({
        where: { email },
      });

      // Send registration email
      await this.notificationsService.sendMemberRegisterEmail({
        email: user?.email || email,
        userName: user ? `${user.first_name} ${user.last_name}` : undefined,
        organizationName: organization.name,
        joinToken: organization.slug,
      });

      results.push({
        email,
        status: 'sent',
        userExists: !!user,
      });
    }

    return {
      message: 'Registration emails sent successfully',
      results,
    };
  }

  async registerStaff(staffRegisterDto: StaffRegisterDto, token: string) {
    // Find organization by token
    const invitation = await this.organizationInviteRepository.findOne({
      where: { token },
      relations: ['organization'],
    });
    // console.log('invitation', invitation);

    if (!invitation?.organization.id) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user email exists
    let user = await this.userRepository.findOne({
      where: { email: staffRegisterDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    // Check if already part of this org
    const existingOrgUser = await this.organizationUserRepository.findOne({
      where: {
        user_id: user.id,
        organization_id: invitation.organization.id,
      },
    });

    if (existingOrgUser) {
      throw new ConflictException('Already a part of this organization');
    }

    // Create organization_user with STAFF role
    const orgUser = this.organizationUserRepository.create({
      user_id: user.id,
      organization_id: invitation.organization.id,
      role: OrgRole.STAFF,
      status: 'active',
    });

    await this.organizationUserRepository.save(orgUser);

    await this.invitationsService.acceptInvitation(invitation);

    return {
      message: 'User registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      },
    };
  }

  async customRegisterStaff(
    organizationId: string,
    staffRegisterDto: CustomRegisterDto,
  ) {
    // Find organization by id
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.planLimitService.assertCanAddStaff(
      organizationId,
      organization.enterprise_plan,
      staffRegisterDto.email,
    );

    // Process each email in the array using bulk invitation method
    const invitationResults =
      await this.invitationsService.createBulkInvitations(
        organization,
        staffRegisterDto.email,
      );

    // Send emails for newly created invitations
    for (const result of invitationResults) {
      if (result.status === 'created') {
        // Check if user exists for email
        const user = await this.userRepository.findOne({
          where: { email: result.email },
        });

        // Send registration email
        await this.notificationsService.sendStaffRegisterEmail({
          email: result.email,
          userName: user ? `${user.first_name} ${user.last_name}` : undefined,
          organizationName: organization.name,
          joinToken: result.invitationToken,
        });
      }
    }

    return {
      message: 'Staff registration process completed',
      results: invitationResults,
    };
  }

  async registerUser(registerDto: UserRegisterDto) {
    // Check if user email exists
    let user = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (user) {
      throw new ConflictException('User already exists');
    } else {
      // Create new user
      const password_hash = await bcrypt.hash(registerDto.password, 10);

      user = this.userRepository.create({
        email: registerDto.email,
        password_hash,
        first_name: registerDto.firstName,
        last_name: registerDto.lastName,
        phone: registerDto.phone,
        status: 'inactive',
        email_verified: false,
      });

      user = await this.userRepository.save(user);
    }

    // Send welcome email
    await this.notificationsService.sendWelcomeEmail({
      email: user.email,
      userName: `${user.first_name} ${user.last_name}`,
      organizationName: 'ReeTrack Inc',
    });

    return {
      message: 'User registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
        },
      },
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Find user
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['organization_users', 'organization_users.organization'],
    });
    // console.log('USER', user);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    // Check if email is verified
    if (!user.email_verified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your email for the verification link.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      null,
      null,
      ipAddress,
      userAgent,
    );

    return {
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          status: user.status,
        },
        organizations: user.organization_users.map((orgUser) => ({
          id: orgUser.organization.id,
          name: orgUser.organization.name,
          email: orgUser.organization.email,
          role: orgUser.role,
          status: orgUser.status,
          slug: orgUser.organization.slug,
        })),
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    };
  }

  setAuthCookies(response: Response, tokens: { refreshToken: string }) {
    // Access token cookie (short-lived)
    // response.cookie('access_token', tokens.accessToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'lax',
    //   maxAge: 15 * 60 * 1000, // 15 minutes
    // });
    // Refresh token cookie (longer-lived)
    response.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      // path: '/api/v1/auth/refresh', // Only sent to refresh endpoint
    });
  }

  async refreshTokens(
    userId: string,
    oldRefreshToken: string,
    role: string | null,
    currentOrganizationId: string | null,
  ) {
    // Get user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      currentOrganizationId,
      role,
      // storedToken.ip_address,
      // storedToken.user_agent,
    );

    return {
      message: 'Tokens refreshed successfully',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    };
  }

  async getProfile(userId: string, organizationId: string) {
    // Get user organization with their roles
    const orgUser = await this.userRepository.findOne({
      where: {
        id: userId,
        organization_users: {
          organization_id: organizationId,
        },
      },
      relations: ['organization_users.organization'],
    });

    if (!orgUser) {
      throw new UnauthorizedException('No organization user found');
    }

    return {
      id: orgUser.id,
      email: orgUser.email,
      first_name: orgUser.first_name,
      last_name: orgUser.last_name,
      phone: orgUser.phone,
      address: orgUser.address,
      date_of_birth: orgUser.date_of_birth,
      organizations: orgUser.organization_users.map((orgUser) => ({
        id: orgUser.organization.id,
        name: orgUser.organization.name,
        email: orgUser.organization.email,
        role: orgUser.role,
        slug: orgUser.organization.slug,
        address: orgUser.organization.address,
        website: orgUser.organization.website,
        phone: orgUser.organization.phone,
        description: orgUser.organization.description,
        bank: orgUser.organization.bank,
        account_number: orgUser.organization.account_number,
        enterprise_plan: orgUser.organization.enterprise_plan,
        metadata: orgUser.organization.metadata,
      })),
    };
  }

  // async checkSuspiciousActivity(userId: string) {
  //   // Check for multiple IPs
  //   const tokens = await this.refreshTokenRepository.find({
  //     where: { user_id: userId, is_revoked: false },
  //     take: 100,
  //   });

  //   const uniqueIPs = new Set(tokens.map((t) => t.ip_address).filter(Boolean));

  //   if (uniqueIPs.size > 5) {
  //     // Potential account compromise - send alert
  //     const user = await this.userRepository.findOne({ where: { id: userId } });
  //     if (user) {
  //       // TODO: Send security alert email
  //       console.warn(
  //         `Suspicious activity detected for user ${user.email}: ${uniqueIPs.size} unique IPs`,
  //       );
  //     }

  //     // Optional auto logout all devices
  //     // await this.logoutAllDevices(userId);
  //   }
  // }

  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let counter = 2;
    let finalSlug = slug;

    while (
      await this.organizationRepository.findOne({ where: { slug: finalSlug } })
    ) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return finalSlug;
  }

  async generateTokens(
    user: User,
    organizationId?: String | null,
    organizationUserRole?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      currentOrganization: organizationId,
      role: organizationUserRole,
    };

    // Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    });

    // const decoded = this.jwtService.decode(accessToken);
    // console.log('Decoded Token:', decoded);

    // Generate refresh token (1 day)
    const refreshTokenString = crypto.randomBytes(64).toString('hex');
    const refreshToken = this.jwtService.sign(
      { ...payload, token: refreshTokenString },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      },
    );

    return { accessToken, refreshToken };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    await this.userRepository.update(user.id, { reset_password_token: token });

    // Send email with reset link
    await this.notificationsService.sendPasswordResetEmail({
      email: user.email,
      resetToken: token,
    });

    return {
      message: 'Password reset email sent successfully',
    };
  }

  async resetPassword(email, token, password) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.reset_password_token !== token) {
      throw new UnauthorizedException('Invalid token');
    }

    const password_hash = await bcrypt.hash(password, 10);

    await this.userRepository.update(user.id, {
      reset_password_token: null,
      password_hash,
    });

    return {
      message: 'Password reset successfully',
    };
  }

  // Email Verification Methods
  async sendEmailVerification(sendVerificationDto: SendVerificationDto) {
    const user = await this.userRepository.findOne({
      where: { email: sendVerificationDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if there's a created email before in the repository
    const existingAttempt = await this.emailVerificationRepository.findOne({
      where: {
        email: sendVerificationDto.email,
        is_used: false,
      },
      order: { created_at: 'DESC' },
    });

    if (existingAttempt) {
      // Update the otp and expires_at
      await this.emailVerificationRepository.update(
        { email: sendVerificationDto.email },
        { otp, expires_at: expiresAt },
      );
    } else {
      // Create new email verification record
      const emailVerification = this.emailVerificationRepository.create({
        email: sendVerificationDto.email,
        otp,
        expires_at: expiresAt,
        user,
      });
      await this.emailVerificationRepository.save(emailVerification);
    }

    // Send verification email
    await this.notificationsService.sendEmailVerificationOTP({
      email: sendVerificationDto.email,
      userName: `${user.first_name} ${user.last_name}`,
      otp,
    });

    return {
      message: 'Verification code sent to your email',
      data: {
        email: sendVerificationDto.email,
        expires_at: expiresAt,
      },
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.userRepository.findOne({
      where: { email: verifyEmailDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Find valid OTP
    const emailVerification = await this.emailVerificationRepository.findOne({
      where: {
        email: verifyEmailDto.email,
        otp: verifyEmailDto.otp,
        is_used: false,
        expires_at: MoreThan(new Date()),
      },
      order: { created_at: 'DESC' },
    });

    if (!emailVerification) {
      // Check if there's an unused OTP that expired or has too many attempts
      const existingAttempt = await this.emailVerificationRepository.findOne({
        where: {
          email: verifyEmailDto.email,
          is_used: false,
        },
        order: { created_at: 'DESC' },
      });

      if (existingAttempt) {
        existingAttempt.attempts += 1;
        if (
          existingAttempt.attempts >= 3 ||
          existingAttempt.expires_at < new Date()
        ) {
          existingAttempt.is_used = true;
          await this.emailVerificationRepository.save(existingAttempt);
          throw new BadRequestException(
            'Invalid or expired verification code. Please request a new one.',
          );
        }
        await this.emailVerificationRepository.save(existingAttempt);
      }

      throw new BadRequestException('Invalid verification code');
    }

    // Mark OTP as used and update user
    await this.emailVerificationRepository.update(
      { email: verifyEmailDto.email, otp: verifyEmailDto.otp },
      { is_used: true },
    );

    // Update user email verification status
    user.email_verified = true;
    user.status = 'active';
    await this.userRepository.save(user);

    // Send confirmation email
    await this.notificationsService.sendEmailVerifiedNotification({
      email: user.email,
      userName: `${user.first_name} ${user.last_name}`,
    });

    return {
      message: 'Email verified successfully',
      data: {
        email: user.email,
        email_verified: true,
      },
    };
  }
}
