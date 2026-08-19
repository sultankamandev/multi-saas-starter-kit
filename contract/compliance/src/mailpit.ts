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

async function getAllMessages(): Promise<MailpitMessage[]> {
  const res = await axios.get(`${MAILPIT_URL}/api/v1/messages`, {
    params: { limit: 200 },
    validateStatus: () => true,
  });
  return res.data?.messages ?? [];
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
 *
 * This budget must stay strictly below `testTimeout` in vitest.config.ts. When
 * the two were equal, Vitest always killed the test first and reported a bare
 * "Test timed out", hiding the message below that says which mail never came.
 *
 * The number is deliberately generous. Warm, these mails arrive in well under a
 * second; the failures came from running the suite immediately after building
 * the backend image, with the disk still busy — which is exactly what CI does.
 * A long ceiling costs nothing on the happy path, since the poll returns as soon
 * as the mail lands.
 */
export async function waitForToken(
  email: string,
  pattern: RegExp,
  timeoutMs = 45_000
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
  const total = (await getAllMessages()).length;
  throw new Error(
    `no matching mail to ${email} within ${timeoutMs}ms ` +
      `(${total} message(s) in the mailbox). An empty mailbox means the backend ` +
      `never sent it — check SMTP_HOST and the backend log. A full one means it ` +
      `went somewhere else, or the pattern did not match.`
  );
}

/** Clear the mailbox so one test's mail cannot satisfy another's poll. */
export async function clearMail(): Promise<void> {
  await axios.delete(`${MAILPIT_URL}/api/v1/messages`, { validateStatus: () => true });
}
