import { Module } from '@nestjs/common';
import { DynamooseModule } from 'nestjs-dynamoose';
import { EventSchema } from 'src/domain/event/entities/event.schema';
import { EventController } from 'src/domain/event/event.controller';
import { EventService } from 'src/domain/event/event.service';

//! With correct module configuration, the local dynamoDB is populated automatically
//! as soon as executing any creation method.
@Module({
  imports: [
    DynamooseModule.forFeature([
      {
        name: 'Event',
        schema: EventSchema,
        options: {
          tableName: 'event', // e.g. local_event_table
        },
      },
    ]),
  ],
  providers: [EventService],
  controllers: [EventController],
  exports: [EventService],
})
export class EventModule {}
