// src/forwarder/forwarder.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as https from 'https';
import * as qs from 'querystring';

import type {
  ForwarderResponse,
  ForwarderResponseMeta,
} from './interfaces/forwarder-response.interface';
// Import the new interface
import { ExecRequestDto } from './dto/exec-request.dto';

@Injectable()
export class ForwarderService {
  private readonly logger = new Logger(ForwarderService.name);
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
    console.log(`Request params:`, payload.params);
    console.log(`Request headers:`, payload.headers);
    
    // Process the request body based on content type
    const processedBody = this.processRequestBody(payload.body, payload.headers);
    console.log(`Processed body:`, processedBody);
    
    const config: AxiosRequestConfig = {
      url: payload.url,
      method: payload.method || 'GET',
      data: processedBody,
      params: payload.params as Record<string, any> | undefined, // Forward query parameters
      paramsSerializer:
        payload.paramsSerializer as AxiosRequestConfig['paramsSerializer'],
      headers: this.stripContentTypeForGetRequests(
        this.stripHopByHopHeaders(payload.headers),
        payload.method || 'GET'
      ),
      // timeout: payload.timeoutMs || this.defaultTimeout,
      responseType: 'arraybuffer',
      maxContentLength: this.maxResponseBytes,
      validateStatus: () => true,
      maxBodyLength:
        typeof payload.maxBodyLength === 'number' &&
        Number.isFinite(payload.maxBodyLength)
          ? (payload.maxBodyLength as number)
          : this.maxResponseBytes,
      // Add HTTPS agent support for self-signed certificates
      httpsAgent: payload.rejectUnauthorized === false 
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
    };
    // Handle both timeout and timeoutMs for backward compatibility
    const timeoutValue =
      payload.timeoutMs || payload.timeout || this.defaultTimeout;
    config.timeout = timeoutValue;
    console.log('Final axios config:', {
      url: config.url,
      method: config.method,
      params: config.params,
      headers: config.headers,
      data: config.data
    });
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
          this.logger.error('Failed to parse JSON response', error);
          throw error;
        }
      }

      return {
        ok: true,
        meta,
        bodyBase64: responseBuffer.toString('base64'),
        bodyEncoding: 'base64',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Request execution failed', error);
      } else {
        this.logger.error('Request execution failed', new Error(String(error)));
      }
      let errMsg = 'Unknown error';
      if (axios.isAxiosError(error)) {
        errMsg = error.message;
      } else if (error instanceof Error) {
        errMsg = error.message;
      }
      throw new InternalServerErrorException({
        ok: false,
        error: 'REQUEST_EXECUTION_FAILED',
        details: errMsg,
      });
    }
  }

  private processRequestBody(body: unknown, headers: Record<string, string> = {}): unknown {
    if (!body) {
      return body;
    }

    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    
    // If content type is application/x-www-form-urlencoded, serialize the body
    if (contentType.toLowerCase().includes('application/x-www-form-urlencoded')) {
      if (typeof body === 'object' && body !== null) {
        // Convert object to URL-encoded string
        return qs.stringify(body as Record<string, any>);
      } else if (typeof body === 'string') {
        // If it's already a string, return as is
        return body;
      }
    }
    
    // For other content types, return body as is
    return body;
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

  private stripContentTypeForGetRequests(headers: Record<string, string> = {}, method: string = 'GET') {
    if (method.toUpperCase() === 'GET') {
      const result = { ...headers };
      // Remove Content-Type for GET requests as it can confuse some APIs like WHM
      for (const header in result) {
        if (header.toLowerCase() === 'content-type') {
          delete result[header];
        }
      }
      return result;
    }
    return headers;
  }

  private looksLikeJson(contentType?: string): boolean {
    return !!contentType && /application\/json|\+json/i.test(contentType);
  }
}
