import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import {
  CreateTransactionData,
  ListTransactionsFilters,
  ListTransactionsResult,
  TransactionRepository,
  UpdateTransactionData,
} from '../domain/transaction.repository.interface';
import { Transaction } from '../domain/transaction.entity';
import { TransactionType } from '../domain/transaction-type.enum';
import { TransactionType as PrismaTransactionType } from '../../../generated/prisma/enums';

type PrismaTransactionResult = {
  id: number;
  hash: string;
  amount: { toNumber(): number };
  type: PrismaTransactionType;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TransactionPrismaRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(prismaTransaction: PrismaTransactionResult): Transaction {
    return {
      ...prismaTransaction,
      amount: prismaTransaction.amount.toNumber(),
      type: prismaTransaction.type as string as TransactionType,
    };
  }

  async create(data: CreateTransactionData): Promise<Transaction> {
    const result = await this.prisma.transaction.create({ data });
    return this.mapToDomain(result);
  }

  async update(
    hash: string,
    data: UpdateTransactionData,
  ): Promise<Transaction> {
    const result = await this.prisma.transaction.update({
      where: { hash },
      data,
    });
    return this.mapToDomain(result);
  }

  async delete(hash: string): Promise<void> {
    await this.prisma.transaction.delete({ where: { hash } });
  }

  async findByHash(hash: string, userId: number): Promise<Transaction | null> {
    const result = await this.prisma.transaction.findUnique({
      where: { hash },
    });
    if (!result) {
      throw new NotFoundException(`Transaction not found`);
    }
    if (result.userId !== userId) {
      throw new ForbiddenException(`You do not have access to this resource`);
    }
    return this.mapToDomain(result);
  }

  async findAll(
    filters: ListTransactionsFilters,
    userId: number,
  ): Promise<ListTransactionsResult> {
    const { type, page, perPage } = filters;
    const where = {
      userId,
      ...(type !== undefined && { type }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return {
      items: items.map((item) => this.mapToDomain(item)),
      total,
      page,
      perPage,
      totalPages,
    };
  }
}
