import { Transaction } from './transaction.entity';
import { TransactionType } from './transaction-type.enum';

export interface CreateTransactionData {
  amount: number;
  type: TransactionType;
  userId: number;
}

export interface UpdateTransactionData {
  amount?: number;
  type?: TransactionType;
}

export interface ListTransactionsFilters {
  type?: TransactionType;
  page: number;
  perPage: number;
}

export interface ListTransactionsResult {
  items: Transaction[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export interface TransactionRepository {
  create(data: CreateTransactionData): Promise<Transaction>;
  update(hash: string, data: UpdateTransactionData): Promise<Transaction>;
  delete(hash: string): Promise<void>;
  findByHash(hash: string, userId: number): Promise<Transaction | null>;
  findAll(
    filters: ListTransactionsFilters,
    userId: number,
  ): Promise<ListTransactionsResult>;
}
