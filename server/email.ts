/**
 * Transactional email via Resend (https://resend.com).
 *
 * Uses the REST API directly through the global `fetch` (Node 18+), so no extra
 * dependency is needed. Configure with env vars:
 *   RESEND_API_KEY    – your Resend API key (required to enable sending)
 *   RESEND_FROM_EMAIL – a sender on a domain verified in Resend (required)
 *   RESEND_FROM_NAME  – display name (optional, defaults to "PairUp")
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "";
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME ?? "PairUp";

/** True when Resend credentials are present. */
export function isEmailConfigured(): boolean {
  return RESEND_API_KEY.length > 0 && RESEND_FROM_EMAIL.length > 0;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured (missing RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend send failed: ${response.status} ${body}`);
  }
}
