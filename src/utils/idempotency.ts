import { Request } from 'express';

export function getIdempotencyKey(req: Request): string | null {
  return req.headers['idempotency-key'] as string || null;
}

export function validateIdempotencyKey(key: string): boolean {
  return typeof key === 'string' && key.length > 0 && key.length <= 255;
}
