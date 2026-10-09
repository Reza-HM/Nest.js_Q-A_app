import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User, UserStatus } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const mockUser: User = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: '$2a$10$abcdefghijklmnopqrstuv', // Will be mocked
  displayName: 'Test User',
  bio: null,
  avatarUrl: null,
  reputation: 1,
  role: Role.USER,
  status: UserStatus.ACTIVE,
  refreshTokenHash: 'hashed_refresh_token',
  verificationToken: 'valid-token',
  verificationTokenExpiresAt: new Date(Date.now() + 100000),
  resetToken: 'valid-reset-token',
  resetTokenExpiresAt: new Date(Date.now() + 100000),
  oauthProvider: null,
  oauthId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    create: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    findByUsername: jest.Mock;
    findByVerificationToken: jest.Mock;
    findByResetToken: jest.Mock;
    updateRefreshTokenHash: jest.Mock;
    updateVerificationToken: jest.Mock;
    updateResetToken: jest.Mock;
    updatePassword: jest.Mock;
    activateUser: jest.Mock;
    sanitizeUser: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByVerificationToken: jest.fn(),
      findByResetToken: jest.fn(),
      updateRefreshTokenHash: jest.fn(),
      updateVerificationToken: jest.fn(),
      updateResetToken: jest.fn(),
      updatePassword: jest.fn(),
      activateUser: jest.fn(),
      sanitizeUser: jest.fn((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        reputation: u.reputation,
        role: u.role,
        status: u.status,
      })),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-mock-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_ACCESS_SECRET') return 'test-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should hash the password, generate verification token, and create user in UNVERIFIED status', async () => {
      usersService.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        displayName: 'Test User',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('verificationToken');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        UserStatus.UNVERIFIED,
      );
      expect(usersService.updateVerificationToken).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid password and return tokens', async () => {
      jest.spyOn(authService, 'compareData').mockResolvedValue(true);
      jest.spyOn(authService, 'hashData').mockResolvedValue('hashed_refresh');
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.login({
        identifier: 'test@example.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      jest.spyOn(authService, 'compareData').mockResolvedValue(false);
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          identifier: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for suspended user', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        authService.login({
          identifier: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyEmail', () => {
    it('should activate user when token is valid and unexpired', async () => {
      usersService.findByVerificationToken.mockResolvedValue(mockUser);

      const result = await authService.verifyEmail('valid-token');

      expect(result.success).toBe(true);
      expect(usersService.activateUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw BadRequestException for invalid or expired token', async () => {
      usersService.findByVerificationToken.mockResolvedValue(null);

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully update password with valid reset token', async () => {
      usersService.findByResetToken.mockResolvedValue(mockUser);
      jest.spyOn(authService, 'hashData').mockResolvedValue('new_hash_123');

      const result = await authService.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(usersService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        'new_hash_123',
      );
    });

    it('should throw BadRequestException if reset token is invalid', async () => {
      usersService.findByResetToken.mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          token: 'expired-token',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
