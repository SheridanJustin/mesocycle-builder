// undefined = the default integration dev user; null = signed out; a string = that user id.
export const sessionOverride: { userId: string | null | undefined } = { userId: undefined };

export function signInAs(userId: string | null): void {
  sessionOverride.userId = userId;
}
