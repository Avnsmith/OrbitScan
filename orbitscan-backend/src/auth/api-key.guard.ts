import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { env } from '../config/env.config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.query['apiKey'];
    
    if (!apiKey || apiKey !== env.API_KEY) {
      throw new UnauthorizedException('Access Denied: Missing or invalid API Key (x-api-key header)');
    }
    return true;
  }
}
