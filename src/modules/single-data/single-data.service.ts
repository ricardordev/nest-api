import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateSingleDataDto } from './dto/create-single-data.dto';
import { UpdateSingleDataDto } from './dto/update-single-data.dto';
import { QuerySingleDataDto } from './dto/query-single-data.dto';
import { ListSingleDataResult } from './single-data.types';
import { SingleData } from './domain/single-data.entity';
import { SingleDataType } from './domain/single-data-type.enum';
import { SingleDataType as PrismaSingleDataType } from '../../generated/prisma/enums';

type PrismaSingleDataResult = {
  id: number;
  title: string;
  description: string;
  amount: { toNumber(): number };
  type: PrismaSingleDataType;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SingleDataService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(prismaSingleData: PrismaSingleDataResult): SingleData {
    return {
      ...prismaSingleData,
      amount: prismaSingleData.amount.toNumber(),
      type: prismaSingleData.type as string as SingleDataType,
    };
  }

  async create(dto: CreateSingleDataDto, userId: number): Promise<SingleData> {
    const result = await this.prisma.singleData.create({
      data: { ...dto, userId },
    });
    return this.mapToDomain(result);
  }

  async update(
    id: number,
    dto: UpdateSingleDataDto,
    userId: number,
  ): Promise<SingleData> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    const existing = await this.findOneOrFail(id);
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        `You can only update your own single data entries`,
      );
    }
    const result = await this.prisma.singleData.update({
      where: { id },
      data: dto,
    });
    return this.mapToDomain(result);
  }

  async remove(id: number, userId: number): Promise<void> {
    const existing = await this.findOneOrFail(id);
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        `You can only delete your own single data entries`,
      );
    }
    await this.prisma.singleData.delete({ where: { id } });
  }

  async findOne(id: number, userId: number): Promise<SingleData> {
    const record = await this.findOneOrFail(id);
    if (record.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    return record;
  }

  async findAll(
    query: QuerySingleDataDto,
    userId: number,
  ): Promise<ListSingleDataResult> {
    const { type, page, perPage } = query;
    const where = {
      userId,
      ...(type !== undefined && { type }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.singleData.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.singleData.count({ where }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return {
      items: items.map((item) => this.mapToDomain(item)),
      total,
      page,
      perPage,
      totalPages,
    };
  }

  private async findOneOrFail(id: number): Promise<SingleData> {
    const result = await this.prisma.singleData.findUnique({ where: { id } });
    if (!result) {
      throw new NotFoundException(`SingleData not found`);
    }
    return this.mapToDomain(result);
  }
}
