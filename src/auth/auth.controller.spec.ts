import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshTokens: jest.Mock;
    logout: jest.Mock;
    verifyEmail: jest.Mock;
    requestPasswordReset: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({
        user: { id: 'u1', username: 'testuser' },
        verificationToken: 'token123',
        message: 'Registration successful',
      }),
      login: jest.fn().mockResolvedValue({
        user: { id: 'u1', username: 'testuser' },
        tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: '15m' },
      }),
      refreshTokens: jest.fn().mockResolvedValue({
        accessToken: 'a_new',
        refreshToken: 'r_new',
        expiresIn: '15m',
      }),
      logout: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Logged out' }),
      verifyEmail: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Verified' }),
      requestPasswordReset: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Dispatched' }),
      resetPassword: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Reset' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should call authService.register', async () => {
    const dto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      displayName: 'Test User',
    };
    const res = await controller.register(dto);
    expect(res).toHaveProperty('user');
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('should call authService.login', async () => {
    const dto = { identifier: 'test@example.com', password: 'password123' };
    const res = await controller.login(dto);
    expect(res).toHaveProperty('tokens');
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('should call authService.logout', async () => {
    const res = await controller.logout('u1');
    expect(res).toEqual({ success: true, message: 'Logged out' });
    expect(authService.logout).toHaveBeenCalledWith('u1');
  });
});
