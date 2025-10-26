import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
// src/forwarder/dto/exec-request.dto.ts
import type { Method } from 'axios';
import type * as https from 'https';

const VALID_METHODS: Method[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

export class ExecRequestDto {
  @IsOptional()
  paramsSerializer?: (params: any) => string;
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;

  @IsOptional()
  @IsIn(VALID_METHODS)
  method?: Method;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  body?: unknown;

  @IsOptional()
  params?: any;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(120000)
  timeoutMs?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(120000)
  timeout?: number;

  @IsOptional()
  maxBodyLength: number;

  @IsOptional()
  @IsBoolean()
  rejectUnauthorized?: boolean;

  @IsOptional()
  httpsAgent?: https.Agent;

  cert: any;
}
