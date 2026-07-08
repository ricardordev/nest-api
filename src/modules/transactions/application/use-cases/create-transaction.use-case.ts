import { Inject, Injectable } from '@nestjs/common';
import type { TransactionRepository } from '../../domain/transaction.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/transaction.repository.interface';
import { Transaction } from '../../domain/transaction.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly repository: TransactionRepository,
  ) {}

  execute(dto: CreateTransactionDto, userId: number): Promise<Transaction> {
    return this.repository.create({ ...dto, userId });
  }
}
