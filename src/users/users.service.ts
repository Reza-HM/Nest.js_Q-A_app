import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type SanitizedUser = Omit<
  User,
  | 'passwordHash'
  | 'refreshTokenHash'
  | 'verificationToken'
  | 'verificationTokenExpiresAt'
  | 'resetToken'
  | 'resetTokenExpiresAt'
>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  sanitizeUser(user: User): SanitizedUser {
    const safeUser: Partial<User> = { ...user };
    delete safeUser.passwordHash;
    delete safeUser.refreshTokenHash;
    delete safeUser.verificationToken;
    delete safeUser.verificationTokenExpiresAt;
    delete safeUser.resetToken;
    delete safeUser.resetTokenExpiresAt;
    return safeUser as SanitizedUser;
  }

  async create(
    createUserDto: CreateUserDto,
    passwordHash: string,
    status: UserStatus = UserStatus.UNVERIFIED,
  ): Promise<User> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username: createUserDto.username.toLowerCase() },
    });
    if (existingUsername) {
      throw new ConflictException('A user with this username already exists');
    }

    return this.prisma.user.create({
      data: {
        email: createUserDto.email.toLowerCase(),
        username: createUserDto.username.toLowerCase(),
        passwordHash,
        displayName: createUserDto.displayName,
        bio: createUserDto.bio,
        avatarUrl: createUserDto.avatarUrl,
        status,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
  }

  async getPublicProfile(id: string): Promise<SanitizedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id }, { username: id.toLowerCase() }],
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<SanitizedUser> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateProfileDto.displayName && {
          displayName: updateProfileDto.displayName,
        }),
        ...(updateProfileDto.bio !== undefined && {
          bio: updateProfileDto.bio,
        }),
        ...(updateProfileDto.avatarUrl !== undefined && {
          avatarUrl: updateProfileDto.avatarUrl,
        }),
      },
    });

    return this.sanitizeUser(updated);
  }

  async anonymizeAccount(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const anonymizedSuffix = userId.substring(0, 8);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `anonymized_${anonymizedSuffix}@deleted.local`,
        username: `deleted_user_${anonymizedSuffix}`,
        displayName: `Anonymized User`,
        bio: null,
        avatarUrl: null,
        passwordHash: `DELETED_${Date.now()}`,
        status: UserStatus.SUSPENDED,
        refreshTokenHash: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return {
      success: true,
      message: 'Account successfully anonymized and deactivated',
    };
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async updateVerificationToken(
    userId: string,
    verificationToken: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken,
        verificationTokenExpiresAt: expiresAt,
      },
    });
  }

  async updateResetToken(
    userId: string,
    resetToken: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetToken,
        resetTokenExpiresAt: expiresAt,
      },
    });
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async activateUser(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });
  }
}
