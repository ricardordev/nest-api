import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'User login (for API/service integrations)',
    example: 'user-login-123',
  })
  @IsOptional()
  @IsString()
  login?: string;

  @ApiPropertyOptional({
    description: 'User email (for front-end/browser login)',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User password',
    example: 'my-password',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
