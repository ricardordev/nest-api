import { PartialType } from '@nestjs/swagger';
import { CreateSingleDataDto } from './create-single-data.dto';

export class UpdateSingleDataDto extends PartialType(CreateSingleDataDto) {}
