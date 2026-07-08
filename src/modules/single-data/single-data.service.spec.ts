import { Test, TestingModule } from '@nestjs/testing';
import { SingleDataService } from './single-data.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SingleDataType } from './domain/single-data-type.enum';

describe('SingleDataService', () => {
  let service: SingleDataService;
  let mockPrisma: {
    singleData: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockDomainResult = {
    id: 1,
    title: 'Test Title',
    description: 'Test Description',
    amount: 99.9,
    type: SingleDataType.STORY,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaResult = {
    ...mockDomainResult,
    amount: { toNumber: vi.fn().mockReturnValue(99.9) },
  };

  beforeEach(async () => {
    mockPrisma = {
      singleData: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SingleDataService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(SingleDataService);

    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('should create and return a SingleData record', async () => {
      mockPrisma.singleData.create.mockResolvedValue(mockPrismaResult);

      const dto = {
        title: 'Test Title',
        description: 'Test Description',
        amount: 99.9,
        type: SingleDataType.STORY,
      };

      const result = await service.create(dto, 1);

      expect(mockPrisma.singleData.create).toHaveBeenCalledWith({
        data: { ...dto, userId: 1 },
      });
      expect(result).toMatchObject({
        id: 1,
        title: 'Test Title',
        amount: 99.9,
        type: SingleDataType.STORY,
        userId: 1,
      });
    });
  });

  describe('update()', () => {
    it('should update and return the modified record', async () => {
      mockPrisma.singleData.findUnique.mockResolvedValue(mockPrismaResult);
      mockPrisma.singleData.update.mockResolvedValue({
        ...mockPrismaResult,
        amount: { toNumber: vi.fn().mockReturnValue(500) },
      });

      const result = await service.update(1, { amount: 500 }, 1);

      expect(mockPrisma.singleData.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.singleData.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { amount: 500 },
      });
      expect(result.amount).toBe(500);
    });

    it('should throw BadRequestException when update body is empty', async () => {
      await expect(service.update(1, {}, 1)).rejects.toThrow(
        'At least one field must be provided for update',
      );
    });

    it('should throw ForbiddenException when userId does not match', async () => {
      mockPrisma.singleData.findUnique.mockResolvedValue(mockPrismaResult);

      await expect(service.update(1, { amount: 500 }, 999)).rejects.toThrow(
        'You can only update your own single data entries',
      );
    });
  });

  describe('remove()', () => {
    it('should delete the record when userId matches', async () => {
      mockPrisma.singleData.findUnique.mockResolvedValue(mockPrismaResult);
      mockPrisma.singleData.delete.mockResolvedValue({});

      await service.remove(1, 1);

      expect(mockPrisma.singleData.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw ForbiddenException when userId does not match', async () => {
      mockPrisma.singleData.findUnique.mockResolvedValue(mockPrismaResult);

      await expect(service.remove(1, 999)).rejects.toThrow(
        'You can only delete your own single data entries',
      );
    });
  });

  describe('findOne()', () => {
    it('should throw NotFoundException for non-existent id', async () => {
      mockPrisma.singleData.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(
        'SingleData not found',
      );
    });
  });

  describe('findAll()', () => {
    it('should return paginated results with metadata', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockPrismaResult], 10]);

      const result = await service.findAll({ page: 1, perPage: 5 }, 1);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(5);
      expect(result.totalPages).toBe(2);
    });
  });
});
