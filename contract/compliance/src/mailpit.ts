import axios from "axios";

/**
 * Helper for the email-dependent flow tests. These require a real SMTP sink so
 * the backend's outgoing mail can be read back. Point a backend's SMTP_* at a
 * Mailpit instance (docker run -p 1025:1025 -p 8025:8025 axllent/mailpit) and
 * set MAILPIT_URL to its web API (default http://localhost:8025).
 *
 * When MAILPIT_URL is unset the flow tests skip themselves, exactly like the
 * admin tests skip without ADMIN_EMAIL — so the suite stays runnable with no
 * mail server.
 */
const MAILPIT_URL = process.env.MAILPIT_URL;

export function mailEnabled(): boolean {
  return Boolean(MAILPIT_URL);
}

interface MailpitMessage {
  ID: string;
  To: { Address: string }[];
  Subject: string;
}

async function getMessageIDsFor(email: string): Promise<string[]> {
  const res = await axios.get(`${MAILPIT_URL}/api/v1/messages`, {
    params: { limit: 200 },
    validateStatus: () => true,
  });
  const messages: MailpitMessage[] = res.data?.messages ?? [];
  return messages
    .filter((m) => m.To?.some((t) => t.Address.toLowerCase() === email.toLowerCase()))
    .map((m) => m.ID);
}

/** Full text (html + plain) of a single message. */
async function getMessageBody(id: string): Promise<string> {
  const res = await axios.get(`${MAILPIT_URL}/api/v1/message/${id}`, {
    validateStatus: () => true,
  });
  return `${res.data?.HTML ?? ""}\n${res.data?.Text ?? ""}`;
}

/**
 * Poll until a message to `email` whose body matches `pattern` arrives, then
 * return the first capture group (the token). Throws after `timeoutMs`.
 */
export async function waitForToken(
  email: string,
  pattern: RegExp,
  timeoutMs = 15_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const id of await getMessageIDsFor(email)) {
      const body = await getMessageBody(id);
      const m = body.match(pattern);
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no matching mail to ${email} within ${timeoutMs}ms`);
}

/** Clear the mailbox so one test's mail cannot satisfy another's poll. */
export async function clearMail(): Promise<void> {
  await axios.delete(`${MAILPIT_URL}/api/v1/messages`, { validateStatus: () => true });
}
