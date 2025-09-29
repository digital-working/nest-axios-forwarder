// src/forwarder-client/forwarder-client.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// 1. UPDATED INTERFACE: 'needsAuth' is removed, 'headers' is added.
export interface ForwardRequest {
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: any;
  headers?: Record<string, string>; // The caller can now provide any headers.
}

// Interface for the expected response from the forwarder
interface ForwarderResponse {
  ok: boolean;
  meta: {
    status: number;
    headers: Record<string, any>;
  };
  bodyJson?: any;
  bodyBase64?: string;
}

@Injectable()
export class ForwarderClientService {
  private readonly forwarderUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.forwarderUrl =
      this.configService.getOrThrow<string>('FORWARDER_API_URL');
  }

  async forward<T>(request: ForwardRequest): Promise<T> {
    // 2. SIMPLIFIED LOGIC: We merge default headers with any headers the caller provides.
    const finalHeaders = {
      'Content-Type': 'application/json',
      ...request.headers, // Merge caller-provided headers
    };

    // No more 'if (request.needsAuth)' block. The service is now generic.

    const forwarderPayload = {
      url: request.url,
      method: request.method,
      headers: finalHeaders,
      body: request.body,
    };

    try {
      const observable = this.httpService.post<ForwarderResponse>(
        this.forwarderUrl,
        forwarderPayload,
      );
      const response = await firstValueFrom(observable);

      if (!response.data.ok) {
        throw new InternalServerErrorException({
          message: 'Forwarded request failed',
          upstreamResponse: response.data,
        });
      }

      return response.data.bodyJson as T;
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        'Forwarder Client Error:',
        err.response?.data || err.message,
      );
      throw new InternalServerErrorException(
        'Failed to communicate with the forwarder service',
        { cause: err },
      );
    }
  }
}
