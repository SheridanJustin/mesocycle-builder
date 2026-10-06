import { z } from 'zod';
import { ApiRouteError } from './api';

const uuid = z.string().uuid();

export function isUuid(value: string): boolean {
  return uuid.safeParse(value).success;
}

// A malformed id can never match a row, so it is a 404 rather than a validation error.
export function requireUuid(value: string, what: string): string {
  if (!isUuid(value)) throw new ApiRouteError('NOT_FOUND', `${what} not found`);
  return value;
}
