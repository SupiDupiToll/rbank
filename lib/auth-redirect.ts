export const AUTH_REDIRECT_COOKIE_NAME = "rbank_auth_redirect";

export function normalizeAuthRedirect(input: string | null | undefined) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return null;
  }

  return input;
}
