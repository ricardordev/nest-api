import { Test, TestingModule } from '@nestjs/testing';
import { UpdateTransactionUseCase } from './update-transaction.use-case';
import {
  TransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../domain/transaction.repository.interface';
import { Transaction } from '../../domain/transaction.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import type { Mocked } from 'vitest';

describe('UpdateTransactionUseCase', () => {
  let useCase: UpdateTransactionUseCase;
  let repository: Mocked<TransactionRepository>;

  beforeEach(async () => {
    const mockRepo: Mocked<TransactionRepository> = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByHash: vi.fn(),
      findAll: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateTransactionUseCase,
        { provide: TRANSACTION_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get(UpdateTransactionUseCase);
    repository = module.get(TRANSACTION_REPOSITORY);
  });

  it('should update a transaction by hash', async () => {
    const hash = 'uuid-123';
    const dto = { amount: 999 };
    const existing: Transaction = {
      id: 1,
      hash,
      amount: 999,
      type: TransactionType.CREDIT,
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated: Transaction = { ...existing, amount: 999 };

    repository.findByHash.mockResolvedValue(existing);
    repository.update.mockResolvedValue(updated);

    const result = await useCase.execute(hash, dto, existing.userId);

    expect(repository.findByHash).toHaveBeenCalledWith(hash, existing.userId);
    expect(repository.update).toHaveBeenCalledWith(hash, dto);
    expect(result.amount).toBe(999);
  });

  it('should throw if hash not found', async () => {
    repository.findByHash.mockResolvedValue(null);

    await expect(
      useCase.execute('bad-hash', { amount: 1 }, 42),
    ).rejects.toThrow('Transaction not found');
  });
});
