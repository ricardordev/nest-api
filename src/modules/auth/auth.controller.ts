import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { parseDurationMs } from '../../common/utils/duration-parser';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/auth/refresh',
};

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Authenticate with email+password (front-end) or login+password (API), returns access + refresh tokens',
  })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 tries per IP each minute
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    res.cookie('access_token', result.accessToken, {
      ...ACCESS_COOKIE_OPTIONS,
      maxAge: this.parseDurationMs(process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'),
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: this.parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'),
    });

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and return new token pair' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per IP each minute
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      dto.refreshToken ??
      (req.cookies as Record<string, string>)?.refresh_token;
    const result = await this.authService.refresh(token);

    res.cookie('access_token', result.accessToken, {
      ...ACCESS_COOKIE_OPTIONS,
      maxAge: this.parseDurationMs(process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'),
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: this.parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'),
    });

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear tokens and revoke refresh token family' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout((req.user as { id: number }).id);

    res.clearCookie('access_token', ACCESS_COOKIE_OPTIONS);
    res.clearCookie('refresh_token', REFRESH_COOKIE_OPTIONS);

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if current session/token is valid' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return { user: req.user };
  }

  private parseDurationMs(raw: string): number {
    return parseDurationMs(raw, 60 * 60 * 1000); // default 1h
  }
}
