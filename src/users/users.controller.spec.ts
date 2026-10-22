import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    findById: jest.Mock;
    sanitizeUser: jest.Mock;
    updateProfile: jest.Mock;
    anonymizeAccount: jest.Mock;
    getPublicProfile: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findById: jest.fn().mockResolvedValue({ id: 'u1', username: 'testuser' }),
      sanitizeUser: jest.fn((u) => u),
      updateProfile: jest
        .fn()
        .mockResolvedValue({ id: 'u1', displayName: 'Updated' }),
      anonymizeAccount: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Anonymized' }),
      getPublicProfile: jest
        .fn()
        .mockResolvedValue({ id: 'u1', username: 'testuser' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should return current user profile on getMe', async () => {
    const res = await controller.getMe('u1');
    expect(res).toEqual({ id: 'u1', username: 'testuser' });
    expect(usersService.findById).toHaveBeenCalledWith('u1');
  });

  it('should update profile on updateMe', async () => {
    const res = await controller.updateMe('u1', { displayName: 'Updated' });
    expect(res).toEqual({ id: 'u1', displayName: 'Updated' });
    expect(usersService.updateProfile).toHaveBeenCalledWith('u1', {
      displayName: 'Updated',
    });
  });

  it('should anonymize user on deleteMe', async () => {
    const res = await controller.deleteMe('u1');
    expect(res).toEqual({ success: true, message: 'Anonymized' });
    expect(usersService.anonymizeAccount).toHaveBeenCalledWith('u1');
  });

  it('should return public profile', async () => {
    const res = await controller.getPublicProfile('testuser');
    expect(res).toEqual({ id: 'u1', username: 'testuser' });
    expect(usersService.getPublicProfile).toHaveBeenCalledWith('testuser');
  });
});
