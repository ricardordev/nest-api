import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { TransactionType } from '../../domain/transaction-type.enum';

export class CreateTransactionDto {
  @ApiProperty({
    example: 150.5,
    description: 'Transaction value (2 decimals)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.CREDIT })
  @IsEnum(TransactionType)
  type: TransactionType;
}
