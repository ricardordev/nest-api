import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { TransactionRepository } from '../../domain/transaction.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/transaction.repository.interface';
import { Transaction } from '../../domain/transaction.entity';

@Injectable()
export class FindTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly repository: TransactionRepository,
  ) {}

  async execute(hash: string, userId: number): Promise<Transaction> {
    const transaction = await this.repository.findByHash(hash, userId);
    if (!transaction) {
      throw new NotFoundException(`Transaction not found`);
    }

    return transaction;
  }
}
