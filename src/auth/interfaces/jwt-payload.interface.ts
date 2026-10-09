import { Role, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: Role;
  status: UserStatus;
  reputation: number;
}
