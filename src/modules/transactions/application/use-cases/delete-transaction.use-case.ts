import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TransactionRepository } from '../../domain/transaction.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/transaction.repository.interface';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly repository: TransactionRepository,
  ) {}

  async execute(hash: string, userId: number): Promise<void> {
    const existing = await this.repository.findByHash(hash, userId);
    if (!existing) {
      throw new NotFoundException(`Transaction not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(`You can only delete your own transactions`);
    }

    await this.repository.delete(hash);
  }
}
