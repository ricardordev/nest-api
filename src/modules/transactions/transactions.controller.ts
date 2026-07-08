import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTransactionDto } from './application/dto/create-transaction.dto';
import { UpdateTransactionDto } from './application/dto/update-transaction.dto';
import { ListTransactionQueryDto } from './application/dto/list-transaction.query.dto';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { UpdateTransactionUseCase } from './application/use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from './application/use-cases/delete-transaction.use-case';
import { FindTransactionUseCase } from './application/use-cases/find-transaction.use-case';
import { ListTransactionUseCase } from './application/use-cases/list-transaction.use-case';

@ApiTags('transactions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createUseCase: CreateTransactionUseCase,
    private readonly updateUseCase: UpdateTransactionUseCase,
    private readonly deleteUseCase: DeleteTransactionUseCase,
    private readonly findUseCase: FindTransactionUseCase,
    private readonly listUseCase: ListTransactionUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  create(@Body() dto: CreateTransactionDto, @CurrentUser('id') userId: number) {
    return this.createUseCase.execute(dto, userId);
  }

  @Put(':hash')
  @ApiOperation({ summary: 'Update a transaction by hash (UUID)' })
  @ApiParam({ name: 'hash', format: 'uuid' })
  update(
    @Param('hash', ParseUUIDPipe) hash: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.updateUseCase.execute(hash, dto, userId);
  }

  @Delete(':hash')
  @ApiOperation({ summary: 'Delete a transaction by hash (UUID)' })
  @ApiParam({ name: 'hash', format: 'uuid' })
  remove(
    @Param('hash', ParseUUIDPipe) hash: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.deleteUseCase.execute(hash, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with filters and pagination' })
  findAll(
    @Query() query: ListTransactionQueryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.listUseCase.execute(query, userId);
  }

  @Get(':hash')
  @ApiOperation({ summary: 'Search a transaction by hash (UUID)' })
  @ApiParam({ name: 'hash', format: 'uuid' })
  findOne(
    @Param('hash', ParseUUIDPipe) hash: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.findUseCase.execute(hash, userId);
  }
}
