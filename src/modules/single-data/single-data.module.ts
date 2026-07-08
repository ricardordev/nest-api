import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { SingleDataController } from './single-data.controller';
import { SingleDataService } from './single-data.service';

@Module({
  imports: [PrismaModule],
  controllers: [SingleDataController],
  providers: [SingleDataService],
})
export class SingleDataModule {}
