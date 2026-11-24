export function liveChatSession() {
  const origin = process.env.SOPHIA_CHECK_ORIGIN || "http://127.0.0.1:3102";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Use an HTTP loopback test origin");
  const cookie = process.env.SOPHIA_CHECK_COOKIE ?? "";
  if (!/^sophia-session=[A-Za-z0-9_-]{43}$/.test(cookie)) {
    throw new Error("Set SOPHIA_CHECK_COOKIE to the local session cookie of an account with ai_chat.");
  }
  return { origin, headers: { origin, "content-type": "application/json", cookie } };
}
