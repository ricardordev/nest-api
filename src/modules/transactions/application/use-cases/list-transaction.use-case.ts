import { Inject, Injectable } from '@nestjs/common';
import type {
  ListTransactionsResult,
  TransactionRepository,
} from '../../domain/transaction.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/transaction.repository.interface';
import { ListTransactionQueryDto } from '../dto/list-transaction.query.dto';

@Injectable()
export class ListTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly repository: TransactionRepository,
  ) {}

  execute(
    query: ListTransactionQueryDto,
    userId: number,
  ): Promise<ListTransactionsResult> {
    return this.repository.findAll(query, userId);
  }
}
