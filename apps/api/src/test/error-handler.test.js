import { describe, it, expect } from "vitest";
import { createError, asyncHandler, errorHandler } from "../../src/middlewares/errorHandler.js";

// ── createError ─────────────────────────────────
describe("createError", () => {
  it("creates an Error with .status", () => {
    const err = createError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
  });

  it("merges extra properties", () => {
    const err = createError(422, "Validation failed", {
      errors: [{ path: "name", message: "required", code: "invalid" }],
    });
    expect(err.status).toBe(422);
    expect(err.errors).toHaveLength(1);
    expect(err.errors[0].path).toBe("name");
  });

  it("defaults extras to empty object", () => {
    const err = createError(500, "oops");
    expect(err.status).toBe(500);
  });
});

// ── asyncHandler ────────────────────────────────
describe("asyncHandler", () => {
  it("calls the async function and passes req,res,next", async () => {
    const fn = async (req, res) => {
      res.sent = true;
    };
    const req = {};
    const res = {};
    const next = () => {};
    await asyncHandler(fn)(req, res, next);
    expect(res.sent).toBe(true);
  });

  it("catches rejected promises and calls next with error", async () => {
    const error = new Error("fail");
    const fn = async () => {
      throw error;
    };
    let caughtErr;
    const next = (err) => {
      caughtErr = err;
    };
    await asyncHandler(fn)({}, {}, next);
    expect(caughtErr).toBe(error);
  });
});

// ── errorHandler ────────────────────────────────
describe("errorHandler", () => {
  function mockRes() {
    const res = {
      statusCode: 200,
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

  it("sends error envelope with status and message", () => {
    const err = createError(404, "Song not found");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res._status).toBe(404);
    expect(res._body.error.message).toBe("Song not found");
    expect(res._body.error.status).toBe(404);
  });

  it("defaults to status 500 for plain errors", () => {
    const err = new Error("unexpected");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res._status).toBe(500);
    expect(res._body.error.message).toBe("unexpected");
  });

  it("includes errors array when present", () => {
    const err = createError(422, "Validation", {
      errors: [{ path: "title", message: "required", code: "required" }],
    });
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res._body.error.errors).toHaveLength(1);
  });

  it("includes stack in non-production", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const err = createError(500, "fail");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res._body.error.stack).toBeDefined();
    process.env.NODE_ENV = original;
  });

  it("excludes stack in production", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const err = createError(500, "fail");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res._body.error.stack).toBeUndefined();
    process.env.NODE_ENV = original;
  });
});
