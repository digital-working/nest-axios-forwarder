// src/forwarder/ip-whitelist.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly allowedClients: string[];

  constructor(private readonly configService: ConfigService) {
    const clients = this.configService.get<string>('ALLOWED_CLIENTS') || '';
    this.allowedClients = clients
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    // If the whitelist is empty, allow all traffic (useful for development)
    if (this.allowedClients.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = (
      request.headers['x-forwarded-for'] ||
      request.socket.remoteAddress ||
      ''
    )
      .toString()
      .split(':')
      .pop();

    if (clientIp && this.allowedClients.includes(clientIp)) {
      return true;
    }

    throw new ForbiddenException(`IP address ${clientIp} is not allowed.`);
  }
}
