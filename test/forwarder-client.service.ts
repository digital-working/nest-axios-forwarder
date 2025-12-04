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

      // Check if the forwarder itself succeeded
      if (!response.data) {
        throw new InternalServerErrorException({
          message: 'Empty response from forwarder',
        });
      }

      // Check if the upstream request failed (ok: false or error status)
      const upstreamStatus = response.data.meta?.status;
      if (!response.data.ok || (upstreamStatus && upstreamStatus >= 400)) {
        const errorDetails = {
          message: 'Upstream API request failed',
          upstreamStatus: upstreamStatus,
          upstreamData: response.data.bodyJson,
          upstreamHeaders: response.data.meta?.headers,
        };

        console.error('Upstream API Error:', errorDetails);

        throw new InternalServerErrorException(errorDetails);
      }

      return response.data.bodyJson as T;
    } catch (error) {
      // If it's already our custom error, re-throw it
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle axios/network errors
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
