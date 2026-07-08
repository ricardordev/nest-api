// src/modules/transactions/infrastructure/transaction.prisma.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionPrismaRepository } from './transaction.prisma.repository';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { PrismaModule } from '../../../infra/prisma/prisma.module';
import { TransactionType } from '../domain/transaction-type.enum';

describe('TransactionPrismaRepository (INTEGRATION)', () => {
  let repo: TransactionPrismaRepository;
  let prisma: PrismaService;
  let testUserId: number;

  beforeAll(async () => {
    // IMPORTANT: Override .env loading so PrismaService picks up .env.test
    // PrismaModule is @Global(), so importing it provides the real PrismaService
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule], // ← real PrismaModule, real PrismaService, real DB
      providers: [TransactionPrismaRepository],
    }).compile();

    repo = module.get(TransactionPrismaRepository);
    prisma = module.get(PrismaService);

    // Create a test user so foreign key constraints are satisfied
    const user = await prisma.user.upsert({
      where: { email: 'repo-test@example.com' },
      update: {},
      create: {
        email: 'repo-test@example.com',
        login: 'repo-test',
        password: 'hashed-doesnt-matter',
      },
    });
    testUserId = user.id;
  });

  // Clean ALL tables after each test
  afterEach(async () => {
    await prisma.transaction.deleteMany();
  });

  afterAll(async () => {
    // Clean up test user and all related data
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should create a transaction and retrieve it by hash', async () => {
    // ACT — real INSERT into the test database
    const created = await repo.create({
      amount: 150.75,
      type: TransactionType.DEBIT,
      userId: testUserId,
    });

    expect(created).toMatchObject({
      amount: 150.75,
      type: TransactionType.DEBIT,
      userId: testUserId,
      hash: expect.any(String),
      id: expect.any(Number),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });

    // ACT — real SELECT from the test database
    const found = await repo.findByHash(created.hash, testUserId);

    expect(found).not.toBeNull();
    expect(found!.amount).toBe(150.75);
    expect(found!.hash).toBe(created.hash);
  });

  it('should update an existing transaction', async () => {
    const created = await repo.create({
      amount: 100,
      type: TransactionType.CREDIT,
      userId: testUserId,
    });

    const updated = await repo.update(created.hash, { amount: 999 });

    expect(updated.amount).toBe(999);
    expect(updated.type).toBe(TransactionType.CREDIT);
    expect(updated.hash).toBe(created.hash);

    // Verify persistence — SELECT it again
    const refetched = await repo.findByHash(created.hash, testUserId);
    expect(refetched!.amount).toBe(999);
  });

  it('should delete a transaction', async () => {
    const created = await repo.create({
      amount: 50,
      type: TransactionType.CREDIT,
      userId: testUserId,
    });

    await repo.delete(created.hash);

    await expect(repo.findByHash(created.hash, testUserId)).rejects.toThrow(
      `Transaction not found`,
    );
  });

  it('should return null for non-existent hash', async () => {
    await expect(
      repo.findByHash('00000000-0000-0000-0000-000000000000', testUserId),
    ).rejects.toThrow(`Transaction not found`);
  });

  it('should list transactions with pagination', async () => {
    // Create 3 test records
    await repo.create({
      amount: 10,
      type: TransactionType.DEBIT,
      userId: testUserId,
    });
    await repo.create({
      amount: 20,
      type: TransactionType.CREDIT,
      userId: testUserId,
    });
    await repo.create({
      amount: 30,
      type: TransactionType.CREDIT,
      userId: testUserId,
    });

    // Page 1, 2 per page
    const result = await repo.findAll({ page: 1, perPage: 2 }, testUserId);

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(2);
  });

  it('should filter transactions by type', async () => {
    await repo.create({
      amount: 100,
      type: TransactionType.DEBIT,
      userId: testUserId,
    });
    await repo.create({
      amount: 200,
      type: TransactionType.CREDIT,
      userId: testUserId,
    });
    await repo.create({
      amount: 300,
      type: TransactionType.CREDIT,
      userId: testUserId,
    });

    const deposits = await repo.findAll(
      {
        type: TransactionType.CREDIT,
        page: 1,
        perPage: 10,
      },
      testUserId,
    );

    expect(deposits.total).toBe(2);
    expect(deposits.items[0].type).toBe(TransactionType.CREDIT);
  });
});
