import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import { parseDurationMs } from '../../common/utils/duration-parser';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

const getRefreshExpiresMs = (): number => {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  return parseDurationMs(raw, REFRESH_DEFAULT_MS);
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.findAndValidateUser(dto);

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      login: user.login,
      email: user.email,
      jti: randomUUID(),
    });

    const refreshToken = this.generateRefreshToken();
    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
    const lookupKey = this.buildLookupKey(refreshToken);
    const family = randomUUID();
    const expiresAt = new Date(Date.now() + getRefreshExpiresMs());

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        lookupKey,
        userId: user.id,
        family,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Resolves the user by auto-detecting the authentication mode:
   * - email + password  → front-end (browser) login
   * - login + password  → API / service integration login
   */
  private async findAndValidateUser(dto: LoginDto) {
    if (dto.login && dto.password) {
      return this.authenticateByLogin(dto.login, dto.password);
    }

    if (dto.email && dto.password) {
      return this.authenticateByEmail(dto.email, dto.password);
    }

    throw new BadRequestException(
      'Provide either email+password (front-end) or login+password (API integration)',
    );
  }

  private async authenticateByEmail(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  private async authenticateByLogin(login: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { login } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid API credentials');
    }

    return user;
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Use lookup key to narrow the search to 1-2 rows (O(1) instead of O(n))
    const lookupKey = this.buildLookupKey(refreshToken);
    const candidateTokens = await this.prisma.refreshToken.findMany({
      where: {
        lookupKey,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    // Only bcrypt.compare against the candidate set (1-2 rows max)
    let matchedToken: (typeof candidateTokens)[number] | null = null;
    for (const stored of candidateTokens) {
      if (await bcrypt.compare(refreshToken, stored.tokenHash)) {
        matchedToken = stored;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if this token is from a family that has been partially revoked
    // (replay attack detection)
    const familyRevoked = await this.prisma.refreshToken.findFirst({
      where: {
        family: matchedToken.family,
        revokedAt: { not: null },
      },
    });

    if (familyRevoked) {
      // Replay attack detected — revoke the whole family
      await this.prisma.refreshToken.updateMany({
        where: { family: matchedToken.family },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Token reuse detected — all sessions revoked',
      );
    }

    // Revoke the current token
    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue a new token pair — same family for rotation
    const user = matchedToken.user;
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      login: user.login,
      email: user.email,
    });

    const newRefreshToken = this.generateRefreshToken();
    const newTokenHash = await bcrypt.hash(newRefreshToken, BCRYPT_SALT_ROUNDS);
    const newLookupKey = this.buildLookupKey(newRefreshToken);
    const expiresAt = new Date(Date.now() + getRefreshExpiresMs());

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        lookupKey: newLookupKey,
        userId: user.id,
        family: matchedToken.family,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: number): Promise<void> {
    // Revoke all refresh token families for this user
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private generateRefreshToken(): string {
    return randomUUID() + '-' + randomUUID();
  }

  /**
   * Creates a non-sensitive lookup key from the raw refresh token.
   * Uses SHA-256 prefix so the database can quickly narrow candidates
   * before the expensive bcrypt.compare.
   */
  private buildLookupKey(token: string): string {
    return createHash('sha256').update(token).digest('hex').substring(0, 16);
  }
}
