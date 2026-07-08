import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TransactionRepository } from '../../domain/transaction.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/transaction.repository.interface';
import { Transaction } from '../../domain/transaction.entity';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly repository: TransactionRepository,
  ) {}

  async execute(
    hash: string,
    dto: UpdateTransactionDto,
    userId: number,
  ): Promise<Transaction> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    const existing = await this.repository.findByHash(hash, userId);
    if (!existing) {
      throw new NotFoundException(`Transaction not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(`You can only update your own transactions`);
    }

    return this.repository.update(hash, dto);
  }
}
