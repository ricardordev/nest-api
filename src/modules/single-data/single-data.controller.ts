import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { SingleDataService } from './single-data.service';
import { CreateSingleDataDto } from './dto/create-single-data.dto';
import { UpdateSingleDataDto } from './dto/update-single-data.dto';
import { QuerySingleDataDto } from './dto/query-single-data.dto';

@ApiTags('single-data')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('single-data')
export class SingleDataController {
  constructor(private readonly singleDataService: SingleDataService) {}

  @Post()
  @ApiOperation({ summary: 'Create a single data' })
  create(@Body() dto: CreateSingleDataDto, @CurrentUser('id') userId: number) {
    return this.singleDataService.create(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a single data by id' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSingleDataDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.singleDataService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a single data by id' })
  @ApiParam({ name: 'id', type: Number })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.singleDataService.remove(id, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List single datas with filters and pagination' })
  findAll(
    @Query() query: QuerySingleDataDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.singleDataService.findAll(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Search a single data by id' })
  @ApiParam({ name: 'id', type: Number })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.singleDataService.findOne(id, userId);
  }
}
