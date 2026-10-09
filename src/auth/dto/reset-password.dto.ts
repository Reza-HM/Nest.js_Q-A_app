import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @Length(8, 100, { message: 'Password must be between 8 and 100 characters' })
  newPassword: string;
}
