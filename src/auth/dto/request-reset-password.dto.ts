import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestResetPasswordDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email: string;
}
