// src/forwarder/forwarder.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import type {
  ForwarderResponse,
  ForwarderResponseMeta,
} from './interfaces/forwarder-response.interface';
// Import the new interface
import { ExecRequestDto } from './dto/exec-request.dto';

@Injectable()
export class ForwarderService {
  private readonly allowedHosts: string[];
  private readonly defaultTimeout: number;
  private readonly maxResponseBytes: number;

  constructor(private readonly configService: ConfigService) {
    const hosts = this.configService.get<string>('ALLOWED_HOSTS') || '';
    this.allowedHosts = hosts
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    this.defaultTimeout = this.configService.get<number>(
      'UPSTREAM_TIMEOUT_MS',
      30000,
    );
    this.maxResponseBytes = this.configService.get<number>(
      'MAX_RESPONSE_BYTES',
      5242880,
    );
  }

  // Add the explicit return type here
  async executeRequest(payload: ExecRequestDto): Promise<ForwarderResponse> {
    if (!this.isHostAllowed(payload.url)) {
      throw new BadRequestException(
        `Host for URL ${payload.url} is not allowed.`,
      );
    }

    console.log(`Forwarding request to ${payload.url}`);
    const config: AxiosRequestConfig = {
      url: payload.url,
      method: payload.method || 'GET',
      data: payload.body,
      params: payload.params, // Forward query parameters
      paramsSerializer: payload.paramsSerializer,
      headers: this.stripHopByHopHeaders(payload.headers),
      // timeout: payload.timeoutMs || this.defaultTimeout,
      responseType: 'arraybuffer',
      maxContentLength: this.maxResponseBytes,
      validateStatus: () => true,
      maxBodyLength: payload.maxBodyLength || this.maxResponseBytes,
    };
    if (payload.timeoutMs) {
      config.timeout = payload.timeoutMs;
    }
    try {
      const response = await axios.request(config);
      const responseBuffer = Buffer.from(response.data);
      const meta: ForwarderResponseMeta = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers, // This assignment is safe
      };

      const contentType = response.headers['content-type'] as string;
      if (this.looksLikeJson(contentType)) {
        try {
          return {
            ok: true,
            meta,
            bodyJson: JSON.parse(responseBuffer.toString('utf8')),
          };
        } catch (error) {
          /* Fallback to base64 */
          console.error(error);
          throw error;
        }
      }

      return {
        ok: true,
        meta,
        bodyBase64: responseBuffer.toString('base64'),
        bodyEncoding: 'base64',
      };
    } catch (error) {
      console.error(error);
      const err = error as AxiosError;
      throw new InternalServerErrorException({
        ok: false,
        error: 'REQUEST_EXECUTION_FAILED',
        details: err.message,
      });
    }
  }

  // ... (rest of the helper methods are unchanged)
  private isHostAllowed(targetUrl: string): boolean {
    try {
      const url = new URL(targetUrl);
      const host = url.hostname.toLowerCase();
      if (this.allowedHosts.length === 0) return true;
      return this.allowedHosts.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`),
      );
    } catch {
      return false;
    }
  }

  private stripHopByHopHeaders(headers: Record<string, string> = {}) {
    const hopByHop = new Set([
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
    ]);
    const result = { ...headers };
    for (const header in result) {
      if (hopByHop.has(header.toLowerCase())) {
        delete result[header];
      }
    }
    return result;
  }

  private looksLikeJson(contentType?: string): boolean {
    return !!contentType && /application\/json|\+json/i.test(contentType);
  }
}
