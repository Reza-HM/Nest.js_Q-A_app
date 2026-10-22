import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 50, {
    message: 'Display name must be between 2 and 50 characters',
  })
  displayName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300, { message: 'Bio cannot exceed 300 characters' })
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
