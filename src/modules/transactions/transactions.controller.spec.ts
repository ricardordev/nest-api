import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { UpdateTransactionUseCase } from './application/use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from './application/use-cases/delete-transaction.use-case';
import { FindTransactionUseCase } from './application/use-cases/find-transaction.use-case';
import { ListTransactionUseCase } from './application/use-cases/list-transaction.use-case';
import { Transaction } from './domain/transaction.entity';
import { TransactionType } from './domain/transaction-type.enum';
import type { Mocked } from 'vitest';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let createUseCase: Mocked<CreateTransactionUseCase>;
  let findUseCase: Mocked<FindTransactionUseCase>;
  let deleteUseCase: Mocked<DeleteTransactionUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: CreateTransactionUseCase, useValue: { execute: vi.fn() } },
        { provide: UpdateTransactionUseCase, useValue: { execute: vi.fn() } },
        { provide: DeleteTransactionUseCase, useValue: { execute: vi.fn() } },
        { provide: FindTransactionUseCase, useValue: { execute: vi.fn() } },
        { provide: ListTransactionUseCase, useValue: { execute: vi.fn() } },
      ],
    }).compile();

    controller = module.get(TransactionsController);
    createUseCase = module.get(CreateTransactionUseCase);
    findUseCase = module.get(FindTransactionUseCase);
    deleteUseCase = module.get(DeleteTransactionUseCase);
  });

  describe('POST /transactions', () => {
    it('should call createUseCase with DTO and userId', async () => {
      const dto = { amount: 100, type: TransactionType.DEBIT };
      const userId = 42;
      const transaction: Transaction = {
        id: 1,
        hash: 'xyz',
        amount: 100,
        type: TransactionType.DEBIT,
        userId: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      createUseCase.execute.mockResolvedValue(transaction);
      const result = await controller.create(dto, userId);

      expect(createUseCase.execute).toHaveBeenCalledWith(dto, 42);
      expect(result).toEqual(transaction);
    });
  });

  describe('GET /transactions/:hash', () => {
    it('should call findUseCase with hash', async () => {
      const transaction: Transaction = {
        id: 1,
        hash: 'abc',
        amount: 50,
        type: TransactionType.DEBIT,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      findUseCase.execute.mockResolvedValue(transaction);
      const result = await controller.findOne('abc', 1);

      expect(findUseCase.execute).toHaveBeenCalledWith('abc', 1);
      expect(result.hash).toBe('abc');
    });
  });

  describe('DELETE /transactions/:hash', () => {
    it('should call deleteUseCase with hash', async () => {
      deleteUseCase.execute.mockResolvedValue(undefined);
      await controller.remove('abc', 42);
      expect(deleteUseCase.execute).toHaveBeenCalledWith('abc', 42);
    });
  });
});
