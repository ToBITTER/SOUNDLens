export const SESSION_COOKIE_NAME = "soundlens_session";

export function isAuthEnabled() {
  return Boolean(process.env.SESSION_SECRET);
}
