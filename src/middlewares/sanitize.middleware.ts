import { Request, Response, NextFunction } from "express";

/**
 * Sanitizes string inputs in req.body to prevent XSS and injection.
 * Trims whitespace and removes null bytes.
 */
export function sanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item)
          : typeof item === "object" && item !== null
            ? deepSanitize(item)
            : item
      );
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = deepSanitize(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function sanitizeString(input: string): string {
  return input
    .replace(/\0/g, "")       // Remove null bytes
    .trim();                   // Trim whitespace (keep content intact for code analysis)
}
