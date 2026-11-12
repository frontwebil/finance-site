import { createHash, timingSafeEqual } from "crypto";

const BEARER_PREFIX = "Bearer ";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isAuthorizedCronRequest(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !authorization?.startsWith(BEARER_PREFIX)) return false;
  const provided = authorization.slice(BEARER_PREFIX.length);
  return timingSafeEqual(digest(provided), digest(secret));
}
