// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { HttpLoggingInterceptor } from './forwarder/http-logging.interceptor';
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
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule {}
