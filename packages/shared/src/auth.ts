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
