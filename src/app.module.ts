import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { SingleDataModule } from './modules/single-data/single-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        // default window: 100 req/min per IP
        ttl: Number(process.env.RATE_LIMIT_SECONDS ?? 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_REQUESTS ?? 100),
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    TransactionsModule,
    SingleDataModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard, // override default ThrottlerGuard
    },
  ],
})
export class AppModule {}
