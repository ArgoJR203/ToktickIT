/**
 * Server-Side Token Revocation Store (Blocklist)
 * Satisfies Handout §6.1, BR-09, and AC-06.
 *
 * When a user logs out (POST /api/auth/logout), the bearer token is recorded here.
 * Any subsequent request presenting a revoked token is rejected with 401 Unauthorized (TOKEN_REVOKED).
 * Tokens expire and are cleaned up automatically after their TTL.
 */

// Store token -> expiry timestamp in milliseconds
const revokedTokens = new Map<string, number>();

/**
 * Revokes a token by adding it to the revocation store.
 * @param token Raw JWT string
 * @param expSeconds Optional unix timestamp (in seconds) when the JWT expires. Defaults to 8 hours from now.
 */
export function revokeToken(token: string, expSeconds?: number): void {
  if (!token) return;

  const nowMs = Date.now();
  let expiresAtMs: number;

  if (typeof expSeconds === "number" && expSeconds > 0) {
    expiresAtMs = expSeconds * 1000;
  } else {
    // Default TTL: 8 hours
    expiresAtMs = nowMs + 8 * 3600 * 1000;
  }

  revokedTokens.set(token, expiresAtMs);
  cleanupExpiredTokens();
}

/**
 * Checks if a token has been revoked.
 * @param token Raw JWT string
 */
export function isTokenRevoked(token: string): boolean {
  if (!token) return false;

  const expiresAt = revokedTokens.get(token);
  if (!expiresAt) return false;

  if (Date.now() > expiresAt) {
    revokedTokens.delete(token);
    return false;
  }

  return true;
}

/**
 * Clears all revoked tokens from the store.
 * Intended for test suite teardown/reset.
 */
export function clearRevocations(): void {
  revokedTokens.clear();
}

/**
 * Internal cleanup to prevent memory leaks from expired tokens.
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, expiresAt] of revokedTokens.entries()) {
    if (now > expiresAt) {
      revokedTokens.delete(token);
    }
  }
}
