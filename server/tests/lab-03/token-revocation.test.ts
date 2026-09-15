import { describe, it, expect, beforeEach } from "vitest";
import {
  revokeToken,
  isTokenRevoked,
  clearRevocations,
} from "../../src/utils/token-revocation.js";

describe("UNIT-03: Token Revocation Store (BR-09, AC-06, §12)", () => {
  beforeEach(() => {
    clearRevocations();
  });

  it("identifies non-revoked tokens correctly", () => {
    expect(isTokenRevoked("some-unrevoked-jwt-token")).toBe(false);
    expect(isTokenRevoked("")).toBe(false);
  });

  it("revokes a token and confirms revoked status", () => {
    const testToken = "jwt.token.abc123xyz";
    expect(isTokenRevoked(testToken)).toBe(false);

    revokeToken(testToken);
    expect(isTokenRevoked(testToken)).toBe(true);
  });

  it("handles multiple distinct tokens independently", () => {
    const token1 = "jwt.token.one";
    const token2 = "jwt.token.two";

    revokeToken(token1);
    expect(isTokenRevoked(token1)).toBe(true);
    expect(isTokenRevoked(token2)).toBe(false);

    revokeToken(token2);
    expect(isTokenRevoked(token1)).toBe(true);
    expect(isTokenRevoked(token2)).toBe(true);
  });

  it("expires revoked tokens after their TTL", () => {
    const shortLivedToken = "jwt.token.expired";
    // Set expiration in the past (unix timestamp in seconds)
    const pastTimestampSeconds = Math.floor(Date.now() / 1000) - 10;

    revokeToken(shortLivedToken, pastTimestampSeconds);

    // Since token is expired, isTokenRevoked returns false and cleans it up
    expect(isTokenRevoked(shortLivedToken)).toBe(false);
  });

  it("clears all tokens on clearRevocations()", () => {
    revokeToken("token-a");
    revokeToken("token-b");
    expect(isTokenRevoked("token-a")).toBe(true);
    expect(isTokenRevoked("token-b")).toBe(true);

    clearRevocations();
    expect(isTokenRevoked("token-a")).toBe(false);
    expect(isTokenRevoked("token-b")).toBe(false);
  });
});
