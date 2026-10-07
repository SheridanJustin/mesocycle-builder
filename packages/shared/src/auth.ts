import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(255);
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters`);

export const RegisterSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(100).optional(),
});
export type Register = z.infer<typeof RegisterSchema>;

export const SignInSchema = z.object({ email, password: z.string().min(1).max(MAX_PASSWORD_LENGTH) });
export type SignIn = z.infer<typeof SignInSchema>;

export const AccountSchema = z.object({ id: z.string().uuid(), email: z.string(), name: z.string().nullable() });
export type Account = z.infer<typeof AccountSchema>;

// GET /me: the signed-in user's profile, display preferences and training stats.
export const MeSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  name: z.string().nullable(),
  created_at: z.string(),
  // How this account can sign in.
  sign_in: z.object({ password: z.boolean(), google: z.boolean() }),
  preferences: z.object({ show_rir: z.boolean() }),
  stats: z.object({
    workouts_completed: z.number().int().min(0),
    workouts_skipped: z.number().int().min(0),
    sets_completed: z.number().int().min(0),
    mesocycles_completed: z.number().int().min(0),
    mesocycles_total: z.number().int().min(0),
    // The active mesocycle with the most recent lock-in, with its progress.
    active: z.object({ id: z.string().uuid(), name: z.string(), done: z.number().int(), total: z.number().int() }).nullable(),
  }),
});
export type Me = z.infer<typeof MeSchema>;

export const UpdateMeSchema = z
  .object({ show_rir: z.boolean().optional(), name: z.string().trim().min(1).max(100).nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });
export type UpdateMe = z.infer<typeof UpdateMeSchema>;
