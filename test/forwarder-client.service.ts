// src/forwarder-client/forwarder-client.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

// A generic interface for requests we want to forward
export interface ForwardRequest {
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  needsAuth?: boolean;
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
  private readonly forwarderUrl?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.forwarderUrl = this.configService.get<string>('FORWARDER_API_URL');
  }

  async forward<T>(request: ForwardRequest): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (request.needsAuth) {
      const token = this.configService.get<string>('HYPERPAY_AUTH_TOKEN');
      if (token !== undefined) {
        headers['Authorization'] = token;
      }
    }

    const forwarderPayload = {
      url: request.url,
      method: request.method,
      headers: headers,
      body: request.body,
    };

    try {
      // FIX APPLIED: Added <ForwarderResponse> generic type
      const observable = this.httpService.post<ForwarderResponse>(
        this.forwarderUrl,
        forwarderPayload,
      );
      const response = await firstValueFrom(observable);

      return response.data.bodyJson as T;
    } catch (error) {
      const err = error as AxiosError;
      console.error('Forwarder Client Error:', err.response?.data);
      throw err;
    }
  }
}
