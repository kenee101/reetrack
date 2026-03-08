import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Organization } from '../../database/entities/organization.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import {
  BVNVerificationDto,
  BVNVerificationResponseDto,
} from './dto/bvn-verification.dto';
import { OrganizationUser } from '../../database/entities/organization-user.entity';
import { OrgRole } from 'src/common/enums/enums';
import { AuthService } from '../auth/auth.service';
import { MemberPlan } from 'src/database/entities';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,

    @InjectRepository(OrganizationUser)
    private organizationUserRepository: Repository<OrganizationUser>,

    @InjectRepository(MemberPlan)
    private memberPlanRepository: Repository<MemberPlan>,

    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  async getOrganization(slug: string) {
    console.log('slug', slug);
    const organization = await this.organizationRepository.findOne({
      where: { slug },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      message: 'Organization retrieved successfully',
      data: organization,
    };
  }

  async selectOrganization(
    userId: string,
    organizationId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const orgUser = await this.organizationUserRepository.findOne({
      where: { user_id: userId, organization_id: organizationId },
      relations: ['organization', 'user'],
    });

    if (!orgUser) {
      throw new UnauthorizedException('Access denied');
    }

    // Generate new tokens for this organization
    return this.authService.generateTokens(
      orgUser.user,
      orgUser.organization_id,
      orgUser.role,
      ipAddress,
      userAgent,
    );
  }

  async updateOrganization(
    organizationId: string,
    updateDto: UpdateOrganizationDto,
    userId: string,
  ) {
    // Check if user is admin
    const orgUser = await this.organizationUserRepository.findOne({
      where: { user_id: userId, organization_id: organizationId },
      relations: ['organization'],
    });

    if (!orgUser || orgUser.role !== OrgRole.ADMIN) {
      throw new ForbiddenException('Only admins can update organization');
    }

    // Check if email is being changed and is unique
    if (
      updateDto.organizationEmail &&
      updateDto.organizationEmail !== orgUser.organization.email
    ) {
      const existingOrg = await this.organizationRepository.findOne({
        where: { email: updateDto.organizationEmail },
      });

      if (existingOrg) {
        throw new ConflictException('Email already in use');
      }
    }

    Object.assign(orgUser.organization, updateDto);
    const updated = await this.organizationRepository.save(
      orgUser.organization,
    );

    return {
      message: 'Organization updated successfully',
      data: updated,
    };
  }

  async getTeamMembers(organizationId: string) {
    const users = await this.organizationUserRepository.find({
      where: {
        organization_id: organizationId,
      },
      select: ['id', 'role', 'status'],
      relations: ['user'],
    });

    return {
      message: 'Team members retrieved successfully',
      data: users,
    };
  }

  async removeUser(
    organizationId: string,
    userIdToRemove: string,
    removerId: string,
  ) {
    // Check if remover is admin
    const remover = await this.organizationUserRepository.findOne({
      where: { user_id: removerId, organization_id: organizationId },
    });

    if (!remover || remover.role !== OrgRole.ADMIN) {
      throw new ForbiddenException('Only admins can remove users');
    }

    // Prevent removing self
    if (userIdToRemove === removerId) {
      throw new ForbiddenException('Cannot remove yourself');
    }

    // Find user to remove
    const userToRemove = await this.organizationUserRepository.findOne({
      where: { user_id: userIdToRemove, organization_id: organizationId },
    });

    if (!userToRemove) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by marking inactive
    userToRemove.status = 'inactive';
    await this.organizationUserRepository.save(userToRemove);

    return {
      message: 'User removed successfully',
    };
  }

  async getOrganizationStats(organizationId: string) {
    // Get basic stats
    const [totalUsers, totalMembers, totalPlans, activeSubscriptions] =
      await Promise.all([
        this.organizationUserRepository.count({
          where: { organization_id: organizationId, status: 'active' },
        }),
        this.organizationUserRepository.query(
          'SELECT COUNT(*) as count FROM organization_users WHERE role = $1',
          [OrgRole.MEMBER],
        ),
        this.memberPlanRepository.query(
          'SELECT COUNT(*) as count FROM member_plans WHERE organization_id = $1 AND is_active = true',
          [organizationId],
        ),
        this.memberPlanRepository.query(
          `SELECT COUNT(DISTINCT ms.id) as count 
            FROM member_subscriptions ms
            INNER JOIN member_plans mp ON ms.plan_id = mp.id
            WHERE mp.organization_id = $1 
            AND ms.status = 'active'`,
          [organizationId],
        ),
      ]);

    return {
      message: 'Organization stats retrieved successfully',
      data: {
        totalUsers,
        totalMembers: parseInt(totalMembers[0].count),
        totalPlans: parseInt(totalPlans[0].count),
        activeSubscriptions: parseInt(activeSubscriptions[0].count),
      },
    };
  }

  // async createOrganizationWithNin(
  //   createOrganizationDto: CreateOrganizationDto,
  //   userId: string,
  // ) {
  //   // First verify the NIN
  //   const ninVerification = await this.verifyNin(
  //     createOrganizationDto.ninVerification,
  //   );

  //   if (ninVerification.status !== 'success') {
  //     throw new BadRequestException(
  //       `NIN verification failed: ${ninVerification.message}`,
  //     );
  //   }

  //   // Check if organization with same email already exists
  //   const existingOrg = await this.organizationRepository.findOne({
  //     where: { email: createOrganizationDto.organizationEmail },
  //   });

  //   if (existingOrg) {
  //     throw new ConflictException(
  //       'Organization with this email already exists',
  //     );
  //   }

  //   // Create organization slug
  //   const slug = await this.generateUniqueSlug(
  //     createOrganizationDto.organizationName,
  //   );

  //   // Create the organization
  //   const organization = this.organizationRepository.create({
  //     name: createOrganizationDto.organizationName,
  //     email: createOrganizationDto.organizationEmail,
  //     slug,
  //     address: createOrganizationDto.address,
  //     website: createOrganizationDto.website,
  //     phone: createOrganizationDto.phone,
  //     description: createOrganizationDto.description,
  //     // Store verified NIN data for audit purposes
  //     metadata: {
  //       ninVerified: true,
  //       ninVerifiedAt: new Date(),
  //       ninData: ninVerification.data,
  //     },
  //   });

  //   const savedOrganization =
  //     await this.organizationRepository.save(organization);

  //   // Add user as organization owner
  //   const orgUser = this.organizationUserRepository.create({
  //     organization_id: savedOrganization.id,
  //     user_id: userId,
  //     role: OrgRole.ADMIN,
  //   });

  //   await this.organizationUserRepository.save(orgUser);

  //   return {
  //     message: 'Organization created successfully with verified NIN',
  //     data: savedOrganization,
  //   };
  // }

  async verifyBvn(
    bvnVerificationDto: BVNVerificationDto,
    organizationId,
  ): Promise<BVNVerificationResponseDto> {
    const { bvn } = bvnVerificationDto;
    const isTest = this.configService.get('app.nodeEnv') === 'development';

    const organization = await this.organizationRepository.findOne({
      where: {
        id: organizationId,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.metadata?.bvnVerified) {
      throw new BadRequestException(
        'BVN already verified for this organization',
      );
    }

    try {
      const koraConfig = this.configService.get('kora');
      const secretKey = isTest
        ? koraConfig.testSecretKey
        : koraConfig.secretKey;

      // console.log(secretKey);
      if (!secretKey) {
        throw new Error('Kora configuration missing');
      }

      // Kora NIN verification API endpoint
      const url = 'https://api.korapay.com/merchant/api/v1/identities/ng/bvn';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: bvn,
          verification_consent: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new BadRequestException(
          result.message || 'BVN verification failed',
        );
      }

      await this.organizationRepository.update(
        { id: organizationId },
        {
          metadata: {
            ...organization.metadata,
            bvnVerified: true,
            bvnVerifiedAt: new Date(),
            bvnData: result.data,
          },
        },
      );

      return {
        status: result.status,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      if (error.message.includes('issue with your input')) {
        throw new BadRequestException(error.message);
      }
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(
        error.message || 'BVN service is unavailable',
      );
    }
  }

  // private async generateUniqueSlug(name: string): Promise<string> {
  //   let slug = name
  //     .toLowerCase()
  //     .replace(/[^a-z0-9]+/g, '-')
  //     .replace(/^-+|-+$/g, '');

  //   let counter = 2;
  //   let finalSlug = slug;

  //   while (
  //     await this.organizationRepository.findOne({ where: { slug: finalSlug } })
  //   ) {
  //     finalSlug = `${slug}-${counter}`;
  //     counter++;
  //   }

  //   return finalSlug;
  // }
}
