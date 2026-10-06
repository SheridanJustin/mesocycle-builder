import { ERROR_STATUS, toApiError, type ApiError, type ErrorCode } from '@mesocycle/shared';
import { NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';

export class ApiRouteError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: { path: string; issue: string }[],
  ) {
    super(message);
  }
}

export function errorResponse(code: ErrorCode, message: string, details?: { path: string; issue: string }[]) {
  const body: ApiError = { error: { code, message, ...(details ? { details } : {}) } };
  return NextResponse.json(body, { status: ERROR_STATUS[code] });
}

// Converts thrown errors into the spec's error format (SPEC 6.1).
export async function handle(run: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiRouteError) return errorResponse(error.code, error.message, error.details);
    if (error instanceof ZodError) return NextResponse.json(toApiError(error), { status: ERROR_STATUS.VALIDATION_ERROR });
    console.error(error);
    return errorResponse('INTERNAL', 'Internal server error');
  }
}

export async function parseJsonBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiRouteError('VALIDATION_ERROR', 'Request body must be valid JSON');
  }
  return schema.parse(raw);
}

// Validates a response body with its schema before sending it (AGENTS.md rule 4).
export function jsonResponse<S extends ZodTypeAny>(schema: S, data: unknown, status = 200): NextResponse {
  return NextResponse.json(schema.parse(data), { status });
}
