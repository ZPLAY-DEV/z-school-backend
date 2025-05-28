import { Module } from '@nestjs/common';
import { DynamoService } from 'src/services/aws/dynamo.service';

@Module({
  providers: [DynamoService],
  exports: [DynamoService],
})
export class DynamoModule {}
