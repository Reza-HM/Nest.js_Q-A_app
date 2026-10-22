import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

const mockUser: User = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed_pw_123',
  displayName: 'Test User',
  bio: 'Developer bio',
  avatarUrl: 'https://example.com/avatar.png',
  reputation: 1,
  role: Role.USER,
  status: UserStatus.UNVERIFIED,
  refreshTokenHash: null,
  verificationToken: 'token123',
  verificationTokenExpiresAt: new Date(Date.now() + 100000),
  resetToken: null,
  resetTokenExpiresAt: null,
  oauthProvider: null,
  oauthId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a new user when email and username are available', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create(
        {
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          displayName: 'Test User',
        },
        'hashed_pw_123',
      );

      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.create(
          {
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            displayName: 'Test User',
          },
          'hashed_pw_123',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username is already taken', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      await expect(
        service.create(
          {
            email: 'different@example.com',
            username: 'testuser',
            password: 'password123',
            displayName: 'Test User',
          },
          'hashed_pw_123',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getPublicProfile', () => {
    it('should return a sanitized user profile without sensitive fields', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const profile = await service.getPublicProfile('testuser');

      expect(profile).toHaveProperty('id', mockUser.id);
      expect(profile).toHaveProperty('username', mockUser.username);
      expect(profile).not.toHaveProperty('passwordHash');
      expect(profile).not.toHaveProperty('refreshTokenHash');
      expect(profile).not.toHaveProperty('verificationToken');
    });

    it('should throw NotFoundException if user is not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('anonymizeAccount', () => {
    it('should anonymize private information and set status to SUSPENDED', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      const result = await service.anonymizeAccount(mockUser.id);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            displayName: 'Anonymized User',
            status: UserStatus.SUSPENDED,
            bio: null,
            avatarUrl: null,
          }),
        }),
      );
    });
  });
});
