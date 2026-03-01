/**
 * Sanitize middleware unit tests.
 */

import { sanitize } from "../src/middlewares/sanitize.middleware";
import { Request, Response } from "express";

function createMockReqRes(body: any) {
  const req = { body } as Request;
  const res = {} as Response;
  const next = jest.fn();
  return { req, res, next };
}

describe("sanitize middleware", () => {
  it("should trim whitespace from string values", () => {
    const { req, res, next } = createMockReqRes({ name: "  hello  " });
    sanitize(req, res, next);
    expect(req.body.name).toBe("hello");
    expect(next).toHaveBeenCalled();
  });

  it("should remove null bytes", () => {
    const { req, res, next } = createMockReqRes({ data: "abc\0def" });
    sanitize(req, res, next);
    expect(req.body.data).toBe("abcdef");
  });

  it("should handle nested objects", () => {
    const { req, res, next } = createMockReqRes({
      outer: { inner: "  nested\0value  " },
    });
    sanitize(req, res, next);
    expect(req.body.outer.inner).toBe("nestedvalue");
  });

  it("should handle arrays of strings", () => {
    const { req, res, next } = createMockReqRes({
      tags: ["  a  ", "\0b\0", "c"],
    });
    sanitize(req, res, next);
    expect(req.body.tags).toEqual(["a", "b", "c"]);
  });

  it("should leave non-string values untouched", () => {
    const { req, res, next } = createMockReqRes({
      count: 42,
      active: true,
      empty: null,
    });
    sanitize(req, res, next);
    expect(req.body).toEqual({ count: 42, active: true, empty: null });
  });

  it("should call next() even with no body", () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn();
    sanitize(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
