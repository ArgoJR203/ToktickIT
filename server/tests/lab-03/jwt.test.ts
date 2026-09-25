import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  signToken,
  verifyToken,
  getJwtSecret,
  resetJwtSecretForTesting,
} from "../../src/utils/jwt.js";

describe("JWT Utility & Secret Security (Handout §6.1)", () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    resetJwtSecretForTesting(null);
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.NODE_ENV = originalNodeEnv;
    resetJwtSecretForTesting(null);
  });

  it("signs and verifies tokens using configured secret", () => {
    process.env.JWT_SECRET = "test_custom_secure_secret_key_12345";
    resetJwtSecretForTesting(null);

    const token = signToken({
      userId: 42,
      email: "test@example.com",
      role: "REQUESTER",
      mustChangePassword: false,
    });

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(42);
    expect(decoded?.email).toBe("test@example.com");
    expect(decoded?.role).toBe("REQUESTER");
  });

  it("fails verification when token is tampered with", () => {
    process.env.JWT_SECRET = "test_custom_secure_secret_key_12345";
    resetJwtSecretForTesting(null);

    const token = signToken({
      userId: 1,
      email: "user@example.com",
      role: "REQUESTER",
      mustChangePassword: false,
    });

    // Tamper with the payload part
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;

    expect(verifyToken(tampered)).toBeNull();
  });

  it("enforces Handout §6.1: throws fatal error in production if JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "production";
    resetJwtSecretForTesting(null);

    expect(() => getJwtSecret()).toThrow(/FATAL: JWT_SECRET environment variable is required in production/);
  });

  it("generates an ephemeral random secret in dev/test when JWT_SECRET is unconfigured (no hardcoded fallback)", () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "development";
    resetJwtSecretForTesting(null);

    // Explicitly disable reading .env file to simulate pure unconfigured environment
    const secret1 = getJwtSecret({ allowEnvFile: false });
    expect(typeof secret1).toBe("string");
    expect(secret1.length).toBeGreaterThan(32);
    // Must NOT be the legacy hardcoded string
    expect(secret1).not.toBe("toktickit_jwt_secret_key_2026_cpe334");

    // Must be a hexadecimal random string
    expect(secret1).toMatch(/^[0-9a-f]{128}$/);
  });
});
