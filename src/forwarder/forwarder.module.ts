// src/forwarder/forwarder.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ForwarderController } from './forwarder.controller';
import { ForwarderService } from './forwarder.service';

@Module({
  imports: [ConfigModule], // Make ConfigService available
  controllers: [ForwarderController],
  providers: [ForwarderService],
})
export class ForwarderModule {}
