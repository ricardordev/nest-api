import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { SingleDataType } from '../domain/single-data-type.enum';

export class CreateSingleDataDto {
  @ApiProperty({ example: 'Item title' })
  @IsString()
  @MaxLength(299)
  title: string;

  @ApiProperty({ example: 'Item description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 99.9 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: SingleDataType })
  @IsEnum(SingleDataType)
  type: SingleDataType;
}
