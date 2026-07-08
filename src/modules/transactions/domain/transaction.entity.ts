import { TransactionType } from './transaction-type.enum';

export class Transaction {
  id: number;
  hash: string;
  amount: number;
  type: TransactionType;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}
