import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import {
  TransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../domain/transaction.repository.interface';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { Transaction } from '../../domain/transaction.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import type { Mocked } from 'vitest';

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let repository: Mocked<TransactionRepository>;

  // Arrange: configure testing module
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
        CreateTransactionUseCase,
        { provide: TRANSACTION_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get(CreateTransactionUseCase);
    repository = module.get(TRANSACTION_REPOSITORY);
  });

  it('should create a transaction and return it', async () => {
    // Arrange
    const dto: CreateTransactionDto = {
      amount: 150.75,
      type: TransactionType.DEBIT,
    };
    const userId = 1;

    const expectedTransaction: Transaction = {
      id: 1,
      hash: 'abc-123',
      amount: 150.75,
      type: TransactionType.DEBIT,
      userId: 1,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    repository.create.mockResolvedValue(expectedTransaction);

    // Act
    const result = await useCase.execute(dto, userId);

    // Assert
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith({
      amount: 150.75,
      type: TransactionType.DEBIT,
      userId: 1,
    });
    expect(result).toEqual(expectedTransaction);
    expect(result.userId).toBe(userId);
  });

  it('should propagate errors from the repository', async () => {
    // Arrange
    const dto: CreateTransactionDto = {
      amount: 10,
      type: TransactionType.DEBIT,
    };
    const userId = 99;

    const dbError = new Error('Database connection failed');
    repository.create.mockRejectedValue(dbError);

    // Act & Assert
    await expect(useCase.execute(dto, userId)).rejects.toThrow(
      'Database connection failed',
    );
  });
});
