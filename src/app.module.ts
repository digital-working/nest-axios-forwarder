// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ForwarderModule } from './forwarder/forwarder.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make config available everywhere
      envFilePath: '.env',
    }),
    ForwarderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
