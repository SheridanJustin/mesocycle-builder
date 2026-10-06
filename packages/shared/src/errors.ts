import { z } from 'zod';

export const ERROR_CODES = ['VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT', 'INTERNAL'] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.array(z.object({ path: z.string(), issue: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// Formats a Zod issue path as `days[0].slots[1].target_sets` (SPEC 6.1).
export function formatIssuePath(path: ReadonlyArray<string | number>): string {
  return path.reduce<string>((acc, part) => {
    if (typeof part === 'number') return `${acc}[${part}]`;
    return acc === '' ? part : `${acc}.${part}`;
  }, '');
}

export function toApiError(error: z.ZodError, message = 'Request validation failed'): ApiError {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: error.issues.map((issue) => ({ path: formatIssuePath(issue.path), issue: issue.message })),
    },
  };
}
