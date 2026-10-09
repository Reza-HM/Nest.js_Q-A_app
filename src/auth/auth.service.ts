import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { SanitizedUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthTokens } from './interfaces/tokens.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async hashData(data: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(data, salt);
  }

  async compareData(data: string, hash: string): Promise<boolean> {
    return bcrypt.compare(data, hash);
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      reputation: user.reputation,
    };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'default_jwt_access_secret_askhub';
    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'default_jwt_refresh_secret_askhub';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(
        { sub: user.id, tokenType: 'refresh' },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  async register(registerDto: RegisterDto): Promise<{
    user: SanitizedUser;
    verificationToken: string;
    message: string;
  }> {
    const passwordHash = await this.hashData(registerDto.password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.usersService.create(
      registerDto,
      passwordHash,
      UserStatus.UNVERIFIED,
    );

    await this.usersService.updateVerificationToken(
      user.id,
      verificationToken,
      verificationExpiresAt,
    );

    return {
      user: this.usersService.sanitizeUser(user),
      verificationToken,
      message:
        'Registration successful. Please verify your email with the provided token.',
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: SanitizedUser; tokens: AuthTokens }> {
    const isEmail = loginDto.identifier.includes('@');
    const user = isEmail
      ? await this.usersService.findByEmail(loginDto.identifier)
      : await this.usersService.findByUsername(loginDto.identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account has been suspended');
    }

    const isPasswordValid = await this.compareData(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    const hashedRefreshToken = await this.hashData(tokens.refreshToken);
    await this.usersService.updateRefreshTokenHash(user.id, hashedRefreshToken);

    return {
      user: this.usersService.sanitizeUser(user),
      tokens,
    };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access Denied');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account has been suspended');
    }

    const isRefreshTokenValid = await this.compareData(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!isRefreshTokenValid) {
      throw new ForbiddenException('Access Denied: Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    const hashedRefreshToken = await this.hashData(tokens.refreshToken);
    await this.usersService.updateRefreshTokenHash(user.id, hashedRefreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<{ success: boolean; message: string }> {
    await this.usersService.updateRefreshTokenHash(userId, null);
    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const userWithToken =
      await this.usersService.findByVerificationToken(token);

    if (!userWithToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.activateUser(userWithToken.id);
    return {
      success: true,
      message: 'Email successfully verified. Your account is now active.',
    };
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return safe message to prevent email enumeration
      return {
        success: true,
        message:
          'If the email exists, a password reset token has been dispatched.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.updateResetToken(
      user.id,
      resetToken,
      resetExpiresAt,
    );

    return {
      success: true,
      message:
        'If the email exists, a password reset token has been dispatched.',
      resetToken, // Returned in dev/API payload for verification and testing
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findByResetToken(
      resetPasswordDto.token,
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const newPasswordHash = await this.hashData(resetPasswordDto.newPassword);
    await this.usersService.updatePassword(user.id, newPasswordHash);

    return {
      success: true,
      message:
        'Password successfully reset. You can now login with your new credentials.',
    };
  }
}
