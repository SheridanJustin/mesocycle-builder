'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

const field = 'mt-1 w-full rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-50';

// Placeholder sign-in. Accounts are out of scope for v1 (SPEC 3): the form sends nothing anywhere.
export function LoginButton() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Log in
      </Button>
      <Dialog
        open={open}
        title="Log in"
        onClose={() => {
          setOpen(false);
          setSubmitted(false);
        }}
      >
        <form onSubmit={submit} className="grid gap-3" aria-label="Log in">
          <label className="block text-sm font-medium text-graphite-200">
            Email
            <input type="email" name="email" autoComplete="email" required className={field} />
          </label>
          <label className="block text-sm font-medium text-graphite-200">
            Password
            <input type="password" name="password" autoComplete="current-password" required className={field} />
          </label>
          {submitted && (
            <p role="status" className="rounded-lg bg-graphite-800 p-2 text-sm text-graphite-200">
              Accounts are coming soon. Your mesocycles are already saved automatically.
            </p>
          )}
          <Button type="submit" variant="primary">
            Log in
          </Button>
        </form>
      </Dialog>
    </>
  );
}
