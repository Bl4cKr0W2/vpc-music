import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { auth } from "../../src/middlewares/auth.js";

// Use a stable test secret
const TEST_SECRET = "test-jwt-secret-for-auth-tests";

// Mock the env module to provide a known JWT secret
vi.mock("../../src/config/env.js", () => ({
  env: { JWT_SECRET: "test-jwt-secret-for-auth-tests" },
}));

function mockReq(overrides = {}) {
  return { cookies: {}, headers: {}, ...overrides };
}

function mockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(body) {
      res._body = body;
      return res;
    },
  };
  return res;
}

describe("auth middleware", () => {
  it("returns 401 when no token is present", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body.error.message).toBe("Not authenticated");
    expect(next).not.toHaveBeenCalled();
  });

  it("reads token from cookies", () => {
    const payload = { id: "user-1", role: "member" };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
    const req = mockReq({ cookies: { token } });
    const res = mockRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe("user-1");
    expect(req.user.role).toBe("member");
  });

  it("reads token from Authorization header (Bearer)", () => {
    const payload = { id: "user-2", role: "owner" };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe("user-2");
    expect(req.user.role).toBe("owner");
  });

  it("prefers cookie token over header", () => {
    const cookiePayload = { id: "cookie-user", role: "member" };
    const headerPayload = { id: "header-user", role: "owner" };
    const cookieToken = jwt.sign(cookiePayload, TEST_SECRET, { expiresIn: "1h" });
    const headerToken = jwt.sign(headerPayload, TEST_SECRET, { expiresIn: "1h" });

    const req = mockReq({
      cookies: { token: cookieToken },
      headers: { authorization: `Bearer ${headerToken}` },
    });
    const res = mockRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(req.user.id).toBe("cookie-user");
  });

  it("returns 401 for an invalid/malformed token", () => {
    const req = mockReq({ cookies: { token: "not-a-valid-jwt" } });
    const res = mockRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body.error.message).toBe("Invalid token");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for an expired token", () => {
    const payload = { id: "expired-user", role: "member" };
    // Sign with 0 seconds expiry — already expired
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "0s" });

    const req = mockReq({ cookies: { token } });
    const res = mockRes();
    const next = vi.fn();

    // jwt.verify will throw TokenExpiredError synchronously
    auth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body.error.message).toBe("Invalid token");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for token signed with wrong secret", () => {
    const payload = { id: "wrong-secret-user", role: "member" };
    const token = jwt.sign(payload, "wrong-secret");

    const req = mockReq({ cookies: { token } });
    const res = mockRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body.error.message).toBe("Invalid token");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when cookies exist but token is empty string", () => {
    const req = mockReq({ cookies: { token: "" } });
    const res = mockRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the full decoded payload to req.user", () => {
    const payload = { id: "u-full", role: "admin", email: "test@example.com" };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
    const req = mockReq({ cookies: { token } });
    const res = mockRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(req.user.id).toBe("u-full");
    expect(req.user.role).toBe("admin");
    expect(req.user.email).toBe("test@example.com");
    // jwt adds iat and exp
    expect(req.user.iat).toBeDefined();
    expect(req.user.exp).toBeDefined();
  });
});
