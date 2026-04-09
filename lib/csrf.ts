export const CSRF_COOKIE_NAME = "rbank-csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function getCsrfTokenFromDocumentCookie() {
  if (typeof document === "undefined") {
    return "";
  }

  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : "";
}
