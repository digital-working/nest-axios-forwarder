import { IsIn, IsInt, IsObject, IsOptional, IsUrl, Max, Min } from 'class-validator';
// src/forwarder/dto/exec-request.dto.ts
import type { Method } from 'axios';

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
  @IsUrl({ require_protocol: true })
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
  @IsInt()
  @Min(100)
  @Max(120000)
  timeoutMs?: number;
}
