import { AccountSchema, RegisterSchema } from '@mesocycle/shared';
import { registerUser } from '../../../../../lib/accounts';
import { handle, jsonResponse, parseJsonBody } from '../../../../../lib/api';

export const dynamic = 'force-dynamic';

// POST /api/v1/auth/register: create an email/password account. The browser signs in right after.
export function POST(request: Request) {
  return handle(async () => {
    const body = await parseJsonBody(request, RegisterSchema);
    const user = await registerUser(body);
    return jsonResponse(AccountSchema, { id: user.id, email: user.email, name: user.name }, 201);
  });
}
