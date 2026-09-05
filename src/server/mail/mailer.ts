// Email delivery abstraction. Production requires a real provider (SMTP/Resend/SES/…); none is
// configured yet, so in production delivery is a deliberate no-op that NEVER logs or returns the
// token/link — we don't pretend an email was sent. In development the reset link is surfaced
// (server log) so the flow is testable end-to-end. The raw token is dev-only, never in prod.

const isProduction = process.env.NODE_ENV === "production";

// True when a real provider is wired up. Left false until one is configured (e.g. RESEND_API_KEY).
export function emailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_URL);
}

export interface PasswordResetMessage {
  to: string;
  resetUrl: string;
}

// Returns whether an email was actually dispatched. In production without a provider this is
// false (and nothing sensitive is logged); callers must not claim delivery based on this.
export async function deliverPasswordReset(msg: PasswordResetMessage): Promise<boolean> {
  if (isProduction) {
    if (!emailProviderConfigured()) {
      // No provider: do nothing, and never log the token or the link.
      console.warn("[mail] password reset requested but no email provider is configured; not sending");
      return false;
    }
    // TODO: integrate the real provider here (send msg.to the reset link). Until then, treat as
    // undelivered rather than logging the token.
    console.warn("[mail] email provider flag set but no transport implemented; not sending");
    return false;
  }

  // Development / test only: safe to surface the link for local testing.
  console.info(`[mail:dev] password reset for ${msg.to} -> ${msg.resetUrl}`);
  return true;
}
