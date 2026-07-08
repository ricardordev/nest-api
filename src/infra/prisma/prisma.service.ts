import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { env } from 'prisma/config';

type PrismaAdapter = PrismaPg | PrismaMariaDb;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseType = env('DATABASE_TYPE');
    let adapter: PrismaAdapter | null = null;

    if (databaseType === 'postgresql') {
      adapter = new PrismaPg({
        connectionString: env('DATABASE_URL'),
      });
    } else if (databaseType === 'mysql' || databaseType === 'mariadb') {
      adapter = new PrismaMariaDb({
        host: env('DATABASE_HOST'),
        port: Number.parseInt(env('DATABASE_PORT')),
        user: env('DATABASE_USER'),
        password: env('DATABASE_PASSWORD'),
        database: env('DATABASE_NAME'),
        connectionLimit: Number.parseInt(env('DATABASE_CONNECTION_LIMIT')),
      });
    }

    if (!adapter) {
      throw new Error(
        `Unsupported or missing DATABASE_TYPE: "${databaseType}". Expected "postgresql", "mysql", or "mariadb".`,
      );
    }

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
