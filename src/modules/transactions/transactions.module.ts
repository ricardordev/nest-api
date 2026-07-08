import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository.interface';
import { TransactionPrismaRepository } from './infrastructure/transaction.prisma.repository';
import { TransactionsController } from './transactions.controller';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { UpdateTransactionUseCase } from './application/use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from './application/use-cases/delete-transaction.use-case';
import { FindTransactionUseCase } from './application/use-cases/find-transaction.use-case';
import { ListTransactionUseCase } from './application/use-cases/list-transaction.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionPrismaRepository },
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    FindTransactionUseCase,
    ListTransactionUseCase,
  ],
})
export class TransactionsModule {}
